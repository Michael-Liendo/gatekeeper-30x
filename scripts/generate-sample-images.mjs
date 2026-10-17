#!/usr/bin/env node
// Generates the demo images of the simulated dataset into public/samples/<id>.jpg.
//
//   node scripts/generate-sample-images.mjs                     # missing images only
//   node scripts/generate-sample-images.mjs --only cp-001,cp-002
//   node scripts/generate-sample-images.mjs --force             # regenerate everything
//   node scripts/generate-sample-images.mjs --dry-run           # print prompts, no API calls
//
// Reads OPENAI_API_KEY from the environment or from .env.local / .env. Requires Node
// >= 22.18 (imports the TypeScript dataset with native type stripping).

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import OpenAI from "openai";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "samples");
const DATASET = path.join(ROOT, "src/modules/content-review/infrastructure/sample-content.ts");

const MODEL = "gpt-image-2";
const CONCURRENCY = 4;
const RETRIES = 2;

// --- args -----------------------------------------------------------------------------

function parseArgs(argv) {
	const args = { only: null, force: false, dryRun: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--force") args.force = true;
		else if (arg === "--dry-run") args.dryRun = true;
		else if (arg === "--only") args.only = argv[++i];
		else if (arg.startsWith("--only=")) args.only = arg.slice("--only=".length);
		else {
			console.error(`Unknown argument: ${arg}`);
			process.exit(1);
		}
	}
	if (args.only !== null) {
		args.only = new Set(
			String(args.only ?? "")
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		);
		if (args.only.size === 0) {
			console.error("--only needs a comma-separated list of ids, e.g. --only cp-001,cp-002");
			process.exit(1);
		}
	}
	return args;
}

// --- env ------------------------------------------------------------------------------

/** Minimal KEY=value parser: ignores comments and blank lines, strips matching quotes. */
function loadEnvFile(file) {
	if (!existsSync(file)) return;
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
		if (!match) continue;
		const [, key, raw] = match;
		if (process.env[key] !== undefined) continue;
		const quoted = /^(["'])(.*)\1$/.exec(raw);
		process.env[key] = quoted ? quoted[2] : raw.replace(/\s+#.*$/, "");
	}
}

// --- prompts --------------------------------------------------------------------------

const CHANNEL_SURFACE = {
	instagram: "an Instagram carousel cover",
	linkedin: "a LinkedIn post image",
	youtube: "a YouTube video cover",
	x: "an X (Twitter) post image",
	newsletter: "a newsletter header image",
	blog: "a blog article cover",
};

const FORMAT_HINT = {
	post: "single social post",
	video_script: "cover frame for a short educational video",
	clip: "cover frame for a short vertical clip, cropped square",
	newsletter: "newsletter issue header",
};

const SAFETY = [
	"No real people, no faces, no photos of people, no hands.",
	"No logos and no real brand names other than the '30X' wordmark when requested.",
	"Spanish text must be spelled exactly as given, with correct accents.",
	"Texto de la imagen en español.",
].join(" ");

/** First sentence of the body, shortened for a subline. */
function subline(body, max = 80) {
	const first = body.replace(/^(Guion|Clip|Meme)\.\s*/i, "").split(/(?<=[.!?])\s/)[0] ?? "";
	if (first.length <= max) return first;
	const cut = first.slice(0, max);
	return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Strips emojis (the spam style draws its own shapes) and third-party brand names. */
function plainTitle(title) {
	return (
		title
			.replace(/\p{Extended_Pictographic}|\u{FE0F}/gu, "")
			// Keep third-party brands out of the images.
			.replace(/\biPhone\b/g, "celular")
			.trim()
	);
}

function cleanPrompt(piece, surface) {
	const sub = subline(piece.body);
	return [
		`Square 1:1 design used as ${surface} (${FORMAT_HINT[piece.format]}) for 30X, a Latin American business school for founders and executives.`,
		"Style: clean editorial design, bold heavy sans-serif headline typography on a flat solid background,",
		"brand palette only: lime #EBFF6F, black #000000, off-white #F5F3EE. Generous margins, strong hierarchy,",
		"one or two simple flat geometric accents at most. Text-heavy carousel-cover look, no photography.",
		`Headline in Spanish (large, left-aligned): "${plainTitle(piece.title)}".`,
		sub ? `Optional short subline in Spanish (small, below the headline): "${sub}".` : "",
		"Small '30X' wordmark at the bottom. No other text besides the headline, subline and wordmark.",
		SAFETY,
	]
		.filter(Boolean)
		.join(" ");
}

function riskyPrompt(piece, surface) {
	return [
		cleanPrompt(piece, surface),
		"This piece makes a risky or questionable claim: the headline is the claim itself and must be",
		"clearly legible and prominent (for example a bold sticker-like badge highlighting the promise,",
		"such as a guarantee, a percentage or a 'fast money' promise), while keeping the clean brand style.",
		"If the topic is sensitive (health, politics, personal story), keep it sober and respectful.",
	].join(" ");
}

function rejectPrompt(piece, surface) {
	const title = plainTitle(piece.title) || "GANA YA";
	const offTopic = /partido|lunes|gato|masa madre/i.test(`${piece.title} ${piece.body}`);
	const style = offTopic
		? [
				"Style: off-topic casual meme or fan post, nothing to do with business education.",
				"Low-effort composition, impact-style meme caption text, simple cartoon illustration",
				"(objects, animals or a stadium, never people or faces), random colors.",
			]
		: [
				"Style: loud spammy scam advertisement. Neon green, hot pink and electric yellow gradients,",
				"clashing colors, many emoji-like flat shapes (rockets, coins, money bags, fire, arrows),",
				"starbursts, excessive exclamation marks, a big 'GANA YA' burst, cluttered layout, fake urgency.",
				"Use a generic phone or coins instead of any branded product.",
			];
	return [
		`Square 1:1 design used as ${surface} (${FORMAT_HINT[piece.format]}), clearly low quality and off-brand.`,
		...style,
		`Main text in Spanish: "${title}".`,
		"No '30X' wordmark. Besides the main text, only short shouty words like '¡GANA YA!' or '¡ÚLTIMOS CUPOS!'.",
		SAFETY,
	].join(" ");
}

export function buildPrompt(piece) {
	const surface = CHANNEL_SURFACE[piece.channel] ?? "a social media image";
	switch (piece.expectedRoute) {
		case "HUMAN_REVIEW":
			return riskyPrompt(piece, surface);
		case "REJECT":
			return rejectPrompt(piece, surface);
		default:
			return cleanPrompt(piece, surface);
	}
}

// --- generation -----------------------------------------------------------------------

async function generate(client, piece) {
	const response = await client.images.generate({
		model: MODEL,
		prompt: buildPrompt(piece),
		size: "1024x1024",
		quality: "low",
		output_format: "jpeg",
		output_compression: 70,
		n: 1,
	});
	const b64 = response.data?.[0]?.b64_json;
	if (!b64) throw new Error("empty image response");
	return Buffer.from(b64, "base64");
}

async function withRetries(fn, label) {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= RETRIES) throw error;
			const wait = 2000 * 2 ** attempt;
			console.warn(`  ${label}: ${error?.message ?? error} — retrying in ${wait / 1000}s`);
			await new Promise((resolve) => setTimeout(resolve, wait));
		}
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { sampleContent } = await import(pathToFileURL(DATASET).href);
	let pieces = sampleContent;
	if (args.only) {
		const unknown = [...args.only].filter((id) => !sampleContent.some((p) => p.id === id));
		if (unknown.length) {
			console.error(`Unknown ids: ${unknown.join(", ")}`);
			process.exit(1);
		}
		pieces = sampleContent.filter((piece) => args.only.has(piece.id));
	}

	if (args.dryRun) {
		for (const piece of pieces)
			console.log(`\n${piece.id} (${piece.expectedRoute})\n${buildPrompt(piece)}`);
		return;
	}

	loadEnvFile(path.join(ROOT, ".env.local"));
	loadEnvFile(path.join(ROOT, ".env"));
	if (!process.env.OPENAI_API_KEY) {
		console.error("OPENAI_API_KEY is not set (env, .env.local or .env).");
		process.exit(1);
	}

	await mkdir(OUT_DIR, { recursive: true });
	const target = (piece) => path.join(OUT_DIR, `${piece.id}.jpg`);
	const todo = pieces.filter((piece) => args.force || !existsSync(target(piece)));
	const skipped = pieces.length - todo.length;
	console.log(
		`${pieces.length} pieces, ${skipped} already generated, ${todo.length} to generate with ${MODEL}.`,
	);

	const client = new OpenAI();
	let done = 0;
	const failed = [];
	let next = 0;
	const worker = async () => {
		while (next < todo.length) {
			const piece = todo[next++];
			try {
				const image = await withRetries(() => generate(client, piece), piece.id);
				await writeFile(target(piece), image);
				done++;
				console.log(
					`[${done + failed.length}/${todo.length}] ${piece.id} ${piece.expectedRoute} ok (${Math.round(image.length / 1024)} KB)`,
				);
			} catch (error) {
				failed.push(piece.id);
				console.error(
					`[${done + failed.length}/${todo.length}] ${piece.id} failed: ${error?.message ?? error}`,
				);
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

	console.log(`Done: ${done} generated, ${skipped} skipped, ${failed.length} failed.`);
	if (failed.length) {
		console.log(`Retry with: node scripts/generate-sample-images.mjs --only ${failed.join(",")}`);
		process.exitCode = 1;
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
