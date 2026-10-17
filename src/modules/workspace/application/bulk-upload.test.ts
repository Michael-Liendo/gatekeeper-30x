import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { DecisionAnswer, DecisionResult } from "../../content-review/domain/decision";
import type { PieceEvent, WorkspacePiece } from "../domain/workspace";
import type { StoredPiece, WorkspaceDeps } from "./workspace-ports";

// Retry extensionless relative imports with ".ts" (same hook as the other use case tests).
registerHooks({
	resolve(specifier, context, nextResolve) {
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

const bulk = await load<typeof import("./bulk-upload")>("./bulk-upload.ts");
const schemas = await load<typeof import("./workspace-schemas")>("./workspace-schemas.ts");
const { defaultBrand } = await load<typeof import("../../brand/domain/default-brand")>(
	"../../brand/domain/default-brand.ts",
);

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

/** Clean answers (AUTO_APPROVE); `spam` flips it to REJECT. */
function answers(spam = false): Record<string, DecisionAnswer> {
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
		is_spam: yesNo(spam ? 0.97 : 0.01),
	};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory deps; `decide` waits a bit and tracks how many reviews run at once. */
function fakeDeps(options: { failTitles?: string[] } = {}) {
	const stored = new Map<string, StoredPiece>();
	const events: PieceEvent[] = [];
	const stats = { inFlight: 0, maxInFlight: 0, calls: 0 };
	let id = 0;
	const deps: WorkspaceDeps = {
		pieces: {
			insert(piece) {
				if (options.failTitles?.includes(piece.piece.title)) throw new Error("disk full");
				stored.set(piece.piece.id, piece);
			},
			update(piece) {
				stored.set(piece.piece.id, piece);
			},
			findById: (pieceId) => stored.get(pieceId) ?? null,
			listByAuthor: () => [...stored.values()].map((s) => s.piece),
			listSampleIds: () => [],
			deleteExamples: () => [],
		},
		events: {
			add: (event) => void events.push(event),
			listByPiece: (pieceId) => events.filter((e) => e.pieceId === pieceId),
		},
		images: {
			save: () => {
				throw new Error("no images in a grid");
			},
			read: () => null,
			removeAll: () => {},
		},
		review: {
			async decide(request): Promise<DecisionResult> {
				stats.calls += 1;
				stats.inFlight += 1;
				stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
				await sleep(5 + Math.random() * 10);
				stats.inFlight -= 1;
				const spam = JSON.stringify(request.input).includes("SPAM");
				return {
					answers: answers(spam),
					provider: "jev",
					model: "test",
					usedFallback: false,
					latencyMs: 1,
					inputTokens: null,
					costUsd: null,
				};
			},
		},
		newId: () => `p-${++id}`,
		now: () => new Date("2026-10-17T10:00:00.000Z"),
	};
	return { deps, stored, events, stats };
}

const actor = { id: "u-1", name: "Ana", role: "copy" as const };

function row(n: number, extra: Partial<{ title: string; body: string; notes: string }> = {}) {
	return {
		title: `Pieza ${n}`,
		body: `Texto de la pieza ${n}.`,
		format: "post" as const,
		channel: "instagram" as const,
		scheduledFor: `2026-10-${String(10 + (n % 20)).padStart(2, "0")}`,
		...extra,
	};
}

describe("bulkUploadSchema", () => {
	it("accepts up to 200 pieces and trims optional fields away", () => {
		const parsed = schemas.bulkUploadSchema.parse({
			campaign: "  ",
			pieces: Array.from({ length: 200 }, (_, i) => ({ ...row(i), title: " ", notes: "" })),
		});
		assert.equal(parsed.pieces.length, 200);
		assert.equal(parsed.campaign, undefined);
		assert.equal(parsed.pieces[0]?.title, undefined);
		assert.equal(parsed.pieces[0]?.notes, undefined);
	});

	it("rejects more than 200 pieces, an empty list, empty or long text and bad dates", () => {
		const tooMany = schemas.bulkUploadSchema.safeParse({
			pieces: Array.from({ length: 201 }, (_, i) => row(i)),
		});
		assert.equal(tooMany.success, false);
		assert.equal(schemas.bulkUploadSchema.safeParse({ pieces: [] }).success, false);

		const empty = schemas.bulkUploadSchema.safeParse({
			pieces: [row(1), { ...row(2), body: " " }],
		});
		assert.equal(empty.success, false);
		if (!empty.success) {
			assert.equal(
				schemas.bulkUploadErrorMessage(empty.error),
				"Pieza 2: Falta el texto de la pieza.",
			);
		}

		const long = schemas.bulkUploadSchema.safeParse({
			pieces: [{ ...row(1), body: "a".repeat(4001) }],
		});
		assert.equal(long.success, false);

		const date = schemas.bulkUploadSchema.safeParse({
			pieces: [{ ...row(1), scheduledFor: "21/10/2026" }],
		});
		assert.equal(date.success, false);

		const channel = schemas.bulkUploadSchema.safeParse({
			pieces: [{ ...row(1), channel: "tiktok" }],
		});
		assert.equal(channel.success, false);
		if (!channel.success) {
			assert.match(schemas.bulkUploadErrorMessage(channel.error), /^Pieza 1: Canal inválido/);
		}
	});
});

describe("bulkUploadPieces", () => {
	it("reviews every piece with at most 8 at a time, in grid order, with campaign and date", async () => {
		const { deps, stats, events } = fakeDeps();
		const pieces = Array.from({ length: 30 }, (_, i) =>
			i === 3 ? row(i, { body: "SPAM SPAM SPAM" }) : row(i),
		);
		const result = await bulk.bulkUploadPieces(
			{ campaign: "Lanzamiento", pieces },
			actor,
			defaultBrand,
			deps,
		);

		assert.equal(stats.calls, 30);
		assert.ok(stats.maxInFlight <= bulk.BULK_CONCURRENCY, `max ${stats.maxInFlight}`);
		assert.ok(stats.maxInFlight > 1, "runs in parallel");
		assert.equal(result.created.length, 30);
		assert.deepEqual(
			result.created.map((p: WorkspacePiece) => p.title),
			pieces.map((p) => p.title),
		);
		assert.equal(result.failed.length, 0);
		assert.equal(result.byStatus.rejected, 1);
		assert.equal(result.byStatus.approved, 29);
		assert.equal(result.byStatus.in_review + result.byStatus.needs_changes, 0);
		assert.equal(typeof result.totalMs, "number");

		const first = result.created[0];
		assert.equal(first?.campaign, "Lanzamiento");
		assert.equal(first?.scheduledFor, pieces[0]?.scheduledFor);
		assert.equal(first?.authorName, "Ana");
		assert.equal(first?.authorId, "u-1");
		const timeline = events.filter((e) => e.pieceId === first?.id);
		assert.equal(timeline[0]?.type, "submitted");
		assert.equal(timeline[0]?.summary, "Cargada desde la grilla");
	});

	it("keeps going when a row fails and reports it by index", async () => {
		const { deps, stored } = fakeDeps({ failTitles: ["Pieza 2", "Pieza 5"] });
		const errors: number[] = [];
		const result = await bulk.bulkUploadPieces(
			{ pieces: Array.from({ length: 7 }, (_, i) => row(i)) },
			actor,
			defaultBrand,
			deps,
			{ onError: (index) => errors.push(index) },
		);
		assert.equal(result.created.length, 5);
		assert.deepEqual(
			result.failed.map((f) => f.index),
			[2, 5],
		);
		assert.equal(result.failed[0]?.error, bulk.BULK_ROW_FAILED_MESSAGE);
		assert.deepEqual(errors.sort(), [2, 5]);
		assert.equal(stored.size, 5);
		assert.equal(result.created[0]?.campaign, undefined);
	});

	it("titles missing rows from the first line and records grid notes", async () => {
		const { deps, events } = fakeDeps();
		const result = await bulk.bulkUploadPieces(
			{
				pieces: [
					{
						body: "Primera línea\nSegunda",
						format: "clip",
						channel: "x",
						notes: "Grabar en exterior",
					},
				],
			},
			actor,
			defaultBrand,
			deps,
		);
		const piece = result.created[0];
		assert.equal(piece?.title, "Primera línea");
		assert.equal(piece?.scheduledFor, undefined);
		const types = events.filter((e) => e.pieceId === piece?.id).map((e) => e.type);
		assert.deepEqual(types, ["submitted", "note", "reviewed"]);
		assert.ok(events.some((e) => e.summary === "Nota de la grilla: Grabar en exterior"));
	});
});
