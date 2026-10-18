import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import type { DecisionAnswer, DecisionResult } from "../../content-review/domain/decision";
import type { WorkspaceDeps } from "./workspace-ports";

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
const workflow = await load<typeof import("./piece-workflow")>("./piece-workflow.ts");
const { defaultBrand } = await load<typeof import("../../brand/domain/default-brand")>(
	"../../brand/domain/default-brand.ts",
);

const dir = mkdtempSync(path.join(tmpdir(), "gatekeeper-workspace-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const db = openDatabase(dir);
after(() => db.close());

const yesNo = (probability: number): DecisionAnswer => ({ type: "yes_no", probability });
const choice = (value: string): DecisionAnswer => ({
	type: "choice",
	choice: value,
	confidence: 0.95,
	probabilities: { [value]: 0.95 },
});
const score = (value: number): DecisionAnswer => ({
	type: "score",
	score: value,
	confidence: 0.95,
	probabilities: [0.02, 0.03, 0.95],
});

/** Clean answers (AUTO_APPROVE), with overrides. */
function answers(overrides: Record<string, DecisionAnswer> = {}): Record<string, DecisionAnswer> {
	return {
		topic: choice("topic_2"),
		format: choice("post"),
		relevance: score(2),
		actionable: score(2),
		too_promotional: yesNo(0.05),
		exaggerated_promises: yesNo(0.03),
		unsourced_claims: yesNo(0.05),
		brand_risk: yesNo(0.02),
		offers_unsold_product: yesNo(0.02),
		is_spam: yesNo(0.01),
		...overrides,
	};
}

function decision(result: Record<string, DecisionAnswer>): DecisionResult {
	return {
		answers: result,
		provider: "jev",
		model: "test",
		usedFallback: false,
		latencyMs: 1,
		inputTokens: null,
		costUsd: null,
	};
}

/** Deps on the temp DB; `decide` answers from the queue (throws when empty → HUMAN_REVIEW). */
function makeDeps(queue: Record<string, DecisionAnswer>[]) {
	let tick = Date.parse("2026-10-17T10:00:00.000Z");
	const seen = { inputs: [] as unknown[], images: 0 };
	const deps: WorkspaceDeps & { seen: typeof seen } = {
		pieces: createPieceRepository(db),
		events: createPieceEventRepository(db),
		images: createImageStore(path.join(dir, "uploads")),
		review: {
			async decide(request) {
				seen.inputs.push(JSON.stringify(request.input));
				if (request.image) seen.images += 1;
				const next = queue.shift();
				if (!next) throw new Error("no provider");
				return decision(next);
			},
		},
		newId: () => crypto.randomUUID(),
		now: () => {
			tick += 1000;
			return new Date(tick);
		},
		seen,
	};
	return deps;
}

const users = createUserRepository(db);
const ana = users.create({ email: "ana@example.com", name: "Ana" });
const beto = users.create({ email: "beto@example.com", name: "Beto" });

const PNG_1PX =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const textPiece = {
	title: "Cómo cerrar una ronda",
	body: "El 90% de los fundadores falla en la primera ronda.",
	format: "post" as const,
	channel: "linkedin" as const,
};

describe("workspace piece workflow", () => {
	it("users: role defaults to other and can be updated", () => {
		assert.equal(ana.role, "other");
		const updated = users.updateRole(ana.id, "copy");
		assert.equal(updated?.role, "copy");
		assert.equal(users.findById(ana.id)?.role, "copy");
		assert.equal(users.updateRole("nope", "copy"), null);
	});

	it("submit: status from the route, two events, image on disk and not in the review", async () => {
		const deps = makeDeps([answers({ unsourced_claims: yesNo(0.8) })]);
		const actor = users.findById(ana.id) ?? ana;
		const piece = await workflow.submitPiece(
			{ ...textPiece, imageDataUrl: PNG_1PX },
			actor,
			defaultBrand,
			deps,
		);
		assert.equal(piece.review.route, "ENRICH_WITH_LLM");
		assert.equal(piece.status, "needs_changes");
		assert.equal(piece.version, 1);
		assert.equal(piece.authorRole, "copy");
		assert.equal(piece.imageUrl, `/api/pieces/${piece.id}/image`);
		assert.equal("imageDataUrl" in piece.review.piece, false);

		const detail = workflow.getPieceDetail(piece.id, actor, deps);
		assert.deepEqual(detail.piece, piece);
		assert.deepEqual(
			detail.events.map((e) => [e.type, e.actorName]),
			[
				["submitted", "Ana"],
				["reviewed", "JEV"],
			],
		);
		assert.match(detail.events[1]?.summary ?? "", /^JEV: Mejorar con IA · Datos sin fuente/);

		const image = workflow.getPieceImage(piece.id, actor, deps);
		assert.equal(image?.mimeType, "image/png");
		assert.ok((image?.bytes.length ?? 0) > 0);
		assert.deepEqual(workflow.listPieces(actor, undefined, deps), [piece]);
		assert.deepEqual(workflow.listPieces(actor, "approved", deps), []);
	});

	it("submit: engine failure goes to in_review with the error kept", async () => {
		const deps = makeDeps([]);
		const piece = await workflow.submitPiece(textPiece, beto, defaultBrand, deps);
		assert.equal(piece.status, "in_review");
		assert.ok(piece.review.error);
		assert.equal(piece.imageUrl, undefined);
	});

	it("status change: updates the piece and logs who moved it", async () => {
		const deps = makeDeps([answers()]);
		const piece = await workflow.submitPiece(textPiece, beto, defaultBrand, deps);
		assert.equal(piece.status, "approved");
		const moved = workflow.changePieceStatus(
			piece.id,
			{ status: "rejected", note: "No es el momento" },
			beto,
			deps,
		);
		assert.equal(moved.status, "rejected");
		const { piece: stored, events } = workflow.getPieceDetail(piece.id, beto, deps);
		assert.equal(stored.status, "rejected");
		const last = events.at(-1);
		assert.equal(last?.type, "status_changed");
		assert.equal(last?.actorName, "Beto");
		assert.equal(last?.summary, "Movida a Rechazado · No es el momento");
	});

	it("new version: bumps version, re-reviews new text, keeps the image", async () => {
		const deps = makeDeps([answers({ too_promotional: yesNo(0.9) }), answers()]);
		const piece = await workflow.submitPiece(
			{ ...textPiece, imageDataUrl: PNG_1PX },
			beto,
			defaultBrand,
			deps,
		);
		assert.equal(piece.status, "needs_changes");

		const next = await workflow.saveNewVersion(
			piece.id,
			{
				title: "Cerrar una ronda, paso a paso",
				body: "Tres pasos concretos.",
				changes: ["Quité el dato sin fuente", "Menos tono de anuncio"],
			},
			beto,
			defaultBrand,
			deps,
		);
		assert.equal(next.version, 2);
		assert.equal(next.status, "approved");
		assert.equal(next.title, "Cerrar una ronda, paso a paso");
		assert.equal(next.imageUrl, piece.imageUrl);
		assert.equal(next.createdAt, piece.createdAt);
		assert.match(String(deps.seen.inputs.at(-1)), /Tres pasos concretos/);
		assert.equal(deps.seen.images, 2);
		assert.ok(workflow.getPieceImage(piece.id, beto, deps));

		const events = workflow.getPieceDetail(piece.id, beto, deps).events;
		assert.deepEqual(
			events.map((e) => e.type),
			["submitted", "reviewed", "version_saved", "reviewed"],
		);
		assert.equal(
			events[2]?.summary,
			"Versión 2 guardada · Quité el dato sin fuente; Menos tono de anuncio",
		);
		assert.equal(events[3]?.summary, "JEV: Aprobado");
	});

	it("new version: a new screenshot is stored as the version's file", async () => {
		const deps = makeDeps([answers(), answers()]);
		const piece = await workflow.submitPiece(textPiece, beto, defaultBrand, deps);
		assert.equal(piece.imageUrl, undefined);
		const next = await workflow.saveNewVersion(
			piece.id,
			{ title: "Con imagen", body: "", changes: [], imageDataUrl: PNG_1PX },
			beto,
			defaultBrand,
			deps,
		);
		assert.equal(next.imageUrl, `/api/pieces/${piece.id}/image`);
		const row = db.prepare("SELECT image_file FROM pieces WHERE id = ?").get(piece.id);
		assert.equal(row?.image_file, `${piece.id}-v2.png`);
	});

	it("saveNewVersion keeps a verdict JEV already gave instead of reviewing again", async () => {
		const deps = makeDeps([answers({ is_spam: yesNo(0.9) })]);
		const piece = await workflow.submitPiece(textPiece, beto, defaultBrand, deps);
		assert.equal(piece.status, "rejected");
		const reviewsBefore = deps.seen.inputs.length;
		const approvedReview = { ...piece.review, route: "AUTO_APPROVE" as const };

		const next = await workflow.saveNewVersion(
			piece.id,
			{ title: "Versión aprobada", body: "Texto nuevo.", changes: [] },
			beto,
			defaultBrand,
			deps,
			approvedReview,
		);
		assert.equal(next.status, "approved");
		assert.equal(next.review.piece.title, "Versión aprobada");
		assert.equal(deps.seen.inputs.length, reviewsBefore);
	});

	it("ownership: other users get PieceNotFoundError everywhere", async () => {
		const deps = makeDeps([answers()]);
		const piece = await workflow.submitPiece(textPiece, beto, defaultBrand, deps);
		const NotFound = workflow.PieceNotFoundError;
		assert.throws(() => workflow.getPieceDetail(piece.id, ana, deps), NotFound);
		assert.throws(
			() => workflow.changePieceStatus(piece.id, { status: "approved" }, ana, deps),
			NotFound,
		);
		assert.throws(() => workflow.getPieceImage(piece.id, ana, deps), NotFound);
		await assert.rejects(
			workflow.saveNewVersion(
				piece.id,
				{ title: "x", body: "y", changes: [] },
				ana,
				defaultBrand,
				deps,
			),
			NotFound,
		);
		assert.throws(() => workflow.getPieceDetail("missing", beto, deps), NotFound);
		assert.equal(
			workflow.listPieces(ana, undefined, deps).some((p) => p.id === piece.id),
			false,
		);
	});

	it("grid pieces: scheduledFor and campaign round-trip through SQLite", async () => {
		const deps = makeDeps([answers()]);
		const piece = await workflow.createReviewedPiece(
			{
				...textPiece,
				image: null,
				ownerId: ana.id,
				authorName: "Ana",
				authorRole: "copy",
				submittedSummary: "Cargada desde la grilla",
				scheduledFor: "2026-10-21",
				campaign: "Lanzamiento",
			},
			defaultBrand,
			deps,
		);
		const stored = deps.pieces.findById(piece.id)?.piece;
		assert.equal(stored?.scheduledFor, "2026-10-21");
		assert.equal(stored?.campaign, "Lanzamiento");
		const plain = workflow
			.listPieces(ana, undefined, deps)
			.find((p) => p.scheduledFor === undefined);
		assert.ok(plain, "pieces without a date have no scheduledFor key");
		assert.equal("campaign" in (plain ?? {}), false);
	});

	it("migrations stay idempotent with the new tables and role column", () => {
		openDatabase(dir).close();
	});
});
