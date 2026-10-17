import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import type { ContentPiece } from "../../content-review/domain/content-piece";
import type { DecisionImage } from "../../content-review/domain/decision";
import type { Route } from "../../content-review/domain/editorial-policy";
import type { SeedDeps } from "./seed-demo-pieces";

// Resolve "@/..." to src/, extensionless relative imports to ".ts", and stub
// "server-only" (it only guards against client bundles).
const srcDir = path.resolve(import.meta.dirname, "../../..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "server-only") {
			return { url: "data:text/javascript,export {};", shortCircuit: true };
		}
		if (specifier.startsWith("@/")) {
			return nextResolve(
				`${pathToFileURL(path.join(srcDir, specifier.slice(2))).href}.ts`,
				context,
			);
		}
		try {
			return nextResolve(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
});

const load = async <T>(relative: string) =>
	(await import(new URL(relative, import.meta.url).href)) as T;

const { openDatabase } = await load<typeof import("../../../shared/db/sqlite")>(
	"../../../shared/db/sqlite.ts",
);
const { createUserRepository } = await load<
	typeof import("../../accounts/infrastructure/user-repository")
>("../../accounts/infrastructure/user-repository.ts");
const { createPieceRepository } = await load<typeof import("../infrastructure/piece-repository")>(
	"../infrastructure/piece-repository.ts",
);
const { createPieceEventRepository } = await load<
	typeof import("../infrastructure/piece-event-repository")
>("../infrastructure/piece-event-repository.ts");
const { createImageStore } = await load<typeof import("../infrastructure/image-store")>(
	"../infrastructure/image-store.ts",
);
const { createSampleImageLoader } = await load<
	typeof import("../infrastructure/sample-image-loader")
>("../infrastructure/sample-image-loader.ts");
const workflow = await load<typeof import("./piece-workflow")>("./piece-workflow.ts");
const seeding = await load<typeof import("./seed-demo-pieces")>("./seed-demo-pieces.ts");
const { defaultBrand } = await load<typeof import("../../brand/domain/default-brand")>(
	"../../brand/domain/default-brand.ts",
);

const dir = mkdtempSync(path.join(tmpdir(), "gatekeeper-seed-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const db = openDatabase(dir);
after(() => db.close());

const ROUTES: Route[] = ["AUTO_APPROVE", "ENRICH_WITH_LLM", "HUMAN_REVIEW", "REJECT"];

/** 5 samples per route, interleaved; the first two of each route have an image. */
const samples: ContentPiece[] = Array.from({ length: 20 }, (_, i) => {
	const route = ROUTES[i % 4] as Route;
	const nth = Math.floor(i / 4);
	return {
		id: `cp-${String(i + 1).padStart(3, "0")}`,
		title: `Muestra ${i + 1}`,
		body: `Texto de la muestra ${i + 1}.`,
		format: "post",
		channel: "linkedin",
		author: "Equipo Media 30X",
		createdAt: "2026-10-01T09:00:00.000Z",
		expectedRoute: route,
		...(nth < 2 ? { imagePath: `/samples/cp-${String(i + 1).padStart(3, "0")}.jpg` } : {}),
	};
});

const JPEG: DecisionImage = { mimeType: "image/jpeg", base64: "/9j/4AAQSkZJRgABAQ==" };

function makeDeps() {
	let tick = Date.parse("2026-10-17T10:00:00.000Z");
	const seen = { decisions: 0, images: 0, loaded: [] as string[], active: 0, maxActive: 0 };
	const deps: SeedDeps & { seen: typeof seen } = {
		pieces: createPieceRepository(db),
		events: createPieceEventRepository(db),
		images: createImageStore(path.join(dir, "uploads")),
		review: {
			async decide(request) {
				seen.decisions += 1;
				if (request.image) seen.images += 1;
				seen.active += 1;
				seen.maxActive = Math.max(seen.maxActive, seen.active);
				await new Promise((resolve) => setTimeout(resolve, 5));
				seen.active -= 1;
				throw new Error("no provider");
			},
		},
		newId: () => crypto.randomUUID(),
		now: () => {
			tick += 1000;
			return new Date(tick);
		},
		samples,
		async loadSampleImage(imagePath) {
			seen.loaded.push(imagePath);
			// Simulates a missing file for one of them.
			return imagePath === "/samples/cp-002.jpg" ? null : JPEG;
		},
		seen,
	};
	return deps;
}

const users = createUserRepository(db);
const carla = users.create({ email: "carla@example.com", name: "Carla" });
const dani = users.create({ email: "dani@example.com", name: "Dani" });

describe("demo example pieces", () => {
	it("pick: first N of each route, in dataset order", () => {
		const picked = seeding.pickDemoSamples(samples);
		assert.equal(picked.length, 12);
		const count = (route: Route) => picked.filter((s) => s.expectedRoute === route).length;
		assert.deepEqual(ROUTES.map(count), [4, 3, 3, 2]);
		assert.deepEqual(
			picked.filter((s) => s.expectedRoute === "REJECT").map((s) => s.id),
			["cp-004", "cp-008"],
		);
	});

	it("seed: 12 reviewed examples, marked, with the sample author and first event", async () => {
		const deps = makeDeps();
		const created = await seeding.seedDemoPieces(carla, defaultBrand, deps);
		assert.equal(created, 12);
		assert.equal(deps.seen.decisions, 12);
		assert.ok(deps.seen.maxActive <= seeding.DEMO_SEED_CONCURRENCY);
		assert.ok(deps.seen.maxActive > 1);

		const pieces = workflow.listPieces(carla, undefined, deps);
		assert.equal(pieces.length, 12);
		assert.ok(pieces.every((p) => p.isExample));
		assert.ok(pieces.every((p) => p.authorId === carla.id));
		assert.ok(pieces.every((p) => p.authorName === "Ejemplo · Equipo Media"));
		// No engine → every piece goes to human review.
		assert.ok(pieces.every((p) => p.status === "in_review"));
		assert.deepEqual(new Set(pieces.map((p) => p.authorRole)), new Set(["design", "copy"]));

		const { events } = workflow.getPieceDetail(pieces[0]?.id ?? "", carla, deps);
		assert.deepEqual(
			events.map((e) => [e.type, e.actorName, e.summary.split(" ·")[0]]),
			[
				["submitted", "Ejemplo · Equipo Media", "Pieza de ejemplo cargada"],
				["reviewed", "JEV", "JEV: Revisar"],
			],
		);
	});

	it("seed: loads images through the injected loader and serves them", async () => {
		const deps = makeDeps();
		await seeding.seedDemoPieces(dani, defaultBrand, deps);
		// cp-001..cp-008 have an imagePath and are all picked (two per route).
		assert.deepEqual(
			[...deps.seen.loaded].sort(),
			Array.from({ length: 8 }, (_, i) => `/samples/cp-00${i + 1}.jpg`),
		);
		assert.equal(deps.seen.images, 7);
		const pieces = workflow.listPieces(dani, undefined, deps);
		const withImage = pieces.filter((p) => p.imageUrl);
		assert.equal(withImage.length, 7);
		const missing = pieces.find((p) => p.title === "Muestra 2");
		assert.equal(missing?.imageUrl, undefined);
		const image = workflow.getPieceImage(withImage[0]?.id ?? "", dani, deps);
		assert.equal(image?.mimeType, "image/jpeg");
	});

	it("seed: idempotent, also with two calls at once", async () => {
		const deps = makeDeps();
		assert.equal(await seeding.seedDemoPieces(carla, defaultBrand, deps), 0);
		assert.equal(deps.seen.decisions, 0);

		const eva = users.create({ email: "eva@example.com", name: "Eva" });
		const [a, b] = await Promise.all([
			seeding.seedDemoPieces(eva, defaultBrand, deps),
			seeding.seedDemoPieces(eva, defaultBrand, deps),
		]);
		assert.equal(a + b, 12);
		assert.equal(workflow.listPieces(eva, undefined, deps).length, 12);
	});

	it("uploads are not examples; remove deletes only examples, events and images", async () => {
		const deps = makeDeps();
		const upload = await workflow.submitPiece(
			{ title: "Mía", body: "Texto propio.", format: "post", channel: "linkedin" },
			dani,
			defaultBrand,
			deps,
		);
		assert.equal(upload.isExample, false);
		const examples = workflow
			.listPieces(dani, undefined, deps)
			.filter((p) => p.isExample && p.imageUrl);
		const imageFile = deps.pieces.findById(examples[0]?.id ?? "")?.imageFile ?? "";
		assert.ok(existsSync(path.join(dir, "uploads", imageFile)));

		assert.equal(seeding.removeDemoPieces(dani, deps), 12);
		assert.deepEqual(
			workflow.listPieces(dani, undefined, deps).map((p) => p.id),
			[upload.id],
		);
		assert.equal(existsSync(path.join(dir, "uploads", imageFile)), false);
		const orphan = db
			.prepare("SELECT COUNT(*) AS n FROM piece_events WHERE piece_id = ?")
			.get(examples[0]?.id ?? "") as { n: number };
		assert.equal(Number(orphan.n), 0);
		assert.equal(seeding.removeDemoPieces(dani, deps), 0);

		// After removing, the examples can be loaded again.
		assert.equal(await seeding.seedDemoPieces(dani, defaultBrand, deps), 12);
	});

	it("disk loader: reads public/samples images, refuses other paths and missing files", async () => {
		const publicDir = path.join(dir, "public");
		mkdirSync(path.join(publicDir, "samples"), { recursive: true });
		writeFileSync(path.join(publicDir, "samples", "cp-001.jpg"), Buffer.from([0xff, 0xd8, 0xff]));
		const loadImage = createSampleImageLoader(publicDir);
		const image = await loadImage("/samples/cp-001.jpg");
		assert.equal(image?.mimeType, "image/jpeg");
		assert.equal(image?.base64, Buffer.from([0xff, 0xd8, 0xff]).toString("base64"));
		assert.equal(await loadImage("/samples/cp-999.jpg"), null);
		assert.equal(await loadImage("/samples/../../etc/passwd"), null);
		assert.equal(await loadImage("/other/cp-001.jpg"), null);
	});

	it("migrations stay idempotent with the sample_id column", () => {
		openDatabase(dir).close();
	});
});
