import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { OPENAI_LLM_MODEL } from "@/modules/content-review/infrastructure/openai-models";
import { env } from "@/shared/config/env";
import type { BrandProfileDraft } from "../domain/brand-profile";
import { type ColorMention, rankColorCandidates } from "../domain/color-candidates";
import { fetchSiteHtml, SiteFetchError } from "./site-fetcher";
import { type ParsedSite, parseSite } from "./site-parser";

/** Tunables for "Analizar mi marca". */
export const BRAND_EXTRACTION_CONFIG = {
	/** URLs the user may submit. */
	maxInputUrls: 3,
	/** Brand colors pre-filled in the draft. */
	maxColors: 4,
	/** Topics kept from the model's answer. */
	maxTopics: 6,
	/** Visible text sent to the model: main page / secondary pages. */
	mainTextChars: 6000,
	secondaryTextChars: 2500,
	openAiTimeoutMs: 30_000,
} as const;

let client: OpenAI | undefined;

/** Created lazily so builds don't need the API key. */
function getOpenAI(): OpenAI {
	if (!env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
	return client;
}

const brandAnalysisSchema = z.object({
	name: z.string(),
	description: z.string(),
	audience: z.string(),
	offerings: z.array(z.string()),
	tone: z.string(),
	topics: z.array(z.string()),
	forbidden: z.array(z.string()),
});

type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;

const INSTRUCTIONS = [
	"Analizas el sitio web de una marca para prellenar su perfil editorial.",
	"Recibes en JSON los metadatos, títulos, menú y una muestra del texto visible de una o varias páginas del sitio.",
	"Responde siempre en español neutro, aunque el sitio esté en otro idioma (los nombres propios se mantienen).",
	"name: el nombre de la marca, corto, sin eslóganes.",
	"description: una o dos frases sobre qué es la marca.",
	"audience: para quién es su contenido, en una frase.",
	"offerings: solo los productos o servicios que el sitio realmente vende u ofrece; no inventes ninguno. Si no hay evidencia, deja la lista vacía.",
	"tone: la voz y el tono que se perciben en el sitio, en una frase con pautas concretas.",
	"topics: entre 3 y 6 temas que la marca cubre, cada uno de 1 a 4 palabras.",
	"forbidden: vacío, salvo que el sitio declare explícitamente temas o afirmaciones que no publica.",
	"Básate únicamente en el contenido recibido.",
].join(" ");

/** Accepts "30x.com" as "https://30x.com"; returns null for anything unusable. */
export function normalizeSiteUrl(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		const url = new URL(withScheme);
		url.hash = "";
		return url.href;
	} catch {
		return null;
	}
}

/** Input URLs (deduped, capped), plus the site root when the first one is a deep link. */
function pagesToFetch(urls: string[]): string[] {
	const pages = [...urls];
	try {
		const first = new URL(urls[0]);
		const root = `${first.origin}/`;
		if ((first.pathname !== "/" || first.search) && !pages.includes(root)) {
			pages.push(root);
		}
	} catch {
		// Invalid URLs are reported when fetched.
	}
	return pages;
}

const clean = (value: string | undefined) => value?.trim() || undefined;
const cleanList = (values: string[] | undefined, limit?: number) => {
	const out = [...new Set((values ?? []).map((v) => v.trim()).filter(Boolean))];
	return limit ? out.slice(0, limit) : out;
};

/** Brand name from metadata: og:site_name, else the first segment of the title. */
function guessName(site: ParsedSite): string | undefined {
	if (site.siteName) return site.siteName;
	const title = site.ogTitle ?? site.title;
	if (!title) return undefined;
	const segments = title
		.split(/\s+[-–—:]\s+|\s*[|·•✔✓]\uFE0F?\s*/)
		.map((s) => s.trim())
		.filter(Boolean);
	return segments[0];
}

function heuristicDraft(main: ParsedSite): BrandProfileDraft {
	return {
		name: clean(guessName(main)),
		description: clean(main.description ?? main.ogDescription),
	};
}

function digest(site: ParsedSite, textChars: number) {
	return {
		url: site.url,
		lang: site.lang,
		title: site.title,
		description: site.description ?? site.ogDescription,
		ogTitle: site.ogTitle,
		siteName: site.siteName,
		h1: site.h1,
		h2: site.h2,
		navLinks: site.navLinks,
		text: site.textSample.slice(0, textChars),
	};
}

async function analyzeWithOpenAI(pages: ParsedSite[]): Promise<BrandAnalysis> {
	const input = JSON.stringify({
		pages: pages.map((page, i) =>
			digest(
				page,
				i === 0
					? BRAND_EXTRACTION_CONFIG.mainTextChars
					: BRAND_EXTRACTION_CONFIG.secondaryTextChars,
			),
		),
	});
	const response = await getOpenAI().responses.parse(
		{
			model: OPENAI_LLM_MODEL,
			instructions: INSTRUCTIONS,
			input,
			text: { format: zodTextFormat(brandAnalysisSchema, "brand_profile_draft") },
		},
		{ timeout: BRAND_EXTRACTION_CONFIG.openAiTimeoutMs, maxRetries: 1 },
	);
	const parsed = response.output_parsed;
	if (!parsed) {
		throw new Error("OpenAI returned no structured brand analysis");
	}
	return parsed;
}

/**
 * "Analizar mi marca": reads the brand's website(s) and pre-fills a profile draft.
 * Never throws for unreachable sites or AI failures; problems go to `warnings`
 * (Spanish) so the user can complete the form by hand.
 */
export async function extractBrandDraft(urls: string[]): Promise<BrandProfileDraft> {
	const warnings: string[] = [];
	const links: string[] = [];
	for (const raw of urls) {
		const normalized = normalizeSiteUrl(raw);
		if (!normalized) {
			warnings.push(`No pudimos leer ${raw}: la dirección no es válida.`);
		} else if (!links.includes(normalized)) {
			links.push(normalized);
		}
	}
	const inputLinks = links.slice(0, BRAND_EXTRACTION_CONFIG.maxInputUrls);
	if (inputLinks.length === 0) {
		return { links: [], warnings: [...warnings, "Agrega al menos un enlace de tu marca."] };
	}

	const targets = pagesToFetch(inputLinks);
	const results = await Promise.allSettled(
		targets.map(async (target) => {
			const page = await fetchSiteHtml(target);
			return parseSite(page.html, page.url);
		}),
	);

	const pages: ParsedSite[] = [];
	const failures: string[] = [];
	results.forEach((result, i) => {
		if (result.status === "fulfilled") {
			pages.push(result.value);
			return;
		}
		const reason =
			result.reason instanceof SiteFetchError
				? result.reason.message
				: "error inesperado al leer la página";
		if (!(result.reason instanceof SiteFetchError)) {
			console.warn(`[brand-extract] failed to read ${targets[i]}:`, result.reason);
		}
		// The site root is our own extra try (always last): report it only if nothing loaded.
		if (inputLinks.includes(targets[i]) || pages.length === 0) {
			failures.push(`No pudimos leer ${targets[i]}: ${reason}.`);
		}
	});

	if (pages.length === 0) {
		return {
			links: inputLinks,
			warnings: [
				...warnings,
				...failures,
				"No pudimos analizar tu sitio; completa el perfil manualmente.",
			],
		};
	}
	warnings.push(...failures);

	// Name and description come from the home page when we have it (deep pages carry
	// page-specific titles); the model still sees every page.
	const isHome = (page: ParsedSite) => {
		const url = new URL(page.url);
		return url.pathname === "/" && url.hostname === new URL(inputLinks[0]).hostname;
	};
	const main = pages.find(isHome) ?? pages[0];
	const colorMentions: ColorMention[] = pages.flatMap((p) => p.colorMentions);
	const colors = rankColorCandidates(colorMentions).slice(0, BRAND_EXTRACTION_CONFIG.maxColors);
	const logoUrl = pages.flatMap((p) => p.logoCandidates)[0];

	const draft: BrandProfileDraft = {
		...heuristicDraft(main),
		colors: colors.length > 0 ? colors : undefined,
		logoUrl,
		links: inputLinks,
	};
	if (colors.length === 0) {
		warnings.push("No encontramos colores de marca en el sitio; elígelos manualmente.");
	}
	if (!logoUrl) {
		warnings.push("No encontramos un logo en el sitio.");
	}

	if (!env.OPENAI_API_KEY) {
		warnings.push(
			"El análisis con IA no está configurado en este entorno: prellenamos solo el nombre, la descripción, los colores y el logo. Completa el resto.",
		);
	} else {
		try {
			const ai = await analyzeWithOpenAI(pages);
			Object.assign(draft, {
				name: clean(ai.name) ?? draft.name,
				description: clean(ai.description) ?? draft.description,
				audience: clean(ai.audience),
				offerings: cleanList(ai.offerings),
				tone: clean(ai.tone),
				topics: cleanList(ai.topics, BRAND_EXTRACTION_CONFIG.maxTopics),
				forbidden: cleanList(ai.forbidden),
			} satisfies BrandProfileDraft);
		} catch (error) {
			console.warn(
				`[brand-extract] OpenAI analysis failed: ${error instanceof Error ? error.message : "unknown error"}`,
			);
			warnings.push(
				"No pudimos completar el análisis con IA: prellenamos solo los datos básicos del sitio. Revisa y completa el resto.",
			);
		}
	}

	if (!draft.name) warnings.push("No encontramos el nombre de la marca.");
	if (!draft.description) warnings.push("No encontramos una descripción de la marca.");

	const result: BrandProfileDraft = Object.fromEntries(
		Object.entries(draft).filter(([, value]) => value !== undefined),
	);
	return warnings.length > 0 ? { ...result, warnings } : result;
}
