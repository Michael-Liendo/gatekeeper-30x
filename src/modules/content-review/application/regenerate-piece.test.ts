import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { BrandProfile } from "../../brand/domain/brand-profile";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionAnswer, DecisionRequest, DecisionResult } from "../domain/decision";
import type { ImageRegenerationInput, RegenerateDeps, RewriteInput } from "./regenerate-piece";

// Retry extensionless relative specifiers with ".ts" (see review-piece.test.ts).
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

const {
	regeneratePiece,
	RegenerationFailedError,
	RegenerationNotConfiguredError,
	IMAGE_NOT_REGENERATED_NOTE,
} = (await import(
	new URL("./regenerate-piece.ts", import.meta.url).href
)) as typeof import("./regenerate-piece");
const { defaultBrand } = (await import(
	new URL("../../brand/domain/default-brand.ts", import.meta.url).href
)) as typeof import("../../brand/domain/default-brand");

const yesNo = (probability: number): DecisionAnswer => ({ type: "yes_no", probability });
const choice = (value: string, confidence = 0.95): DecisionAnswer => ({
	type: "choice",
	choice: value,
	confidence,
	probabilities: { [value]: confidence },
});
const score = (value: number, confidence = 0.95): DecisionAnswer => ({
	type: "score",
	score: value,
	confidence,
	probabilities: [0.02, 0.03, 0.95],
});

function answers(unsourced: number): Record<string, DecisionAnswer> {
	return {
		topic: choice("topic_2"),
		format: choice("post"),
		relevance: score(2),
		actionable: score(2),
		too_promotional: yesNo(0.05),
		exaggerated_promises: yesNo(0.03),
		unsourced_claims: yesNo(unsourced),
		brand_risk: yesNo(0.02),
		offers_unsold_product: yesNo(0.02),
		is_spam: yesNo(0.01),
	};
}

function decision(a: Record<string, DecisionAnswer>): DecisionResult {
	return {
		answers: a,
		provider: "jev",
		model: "test-model",
		latencyMs: 10,
		inputTokens: 100,
		costUsd: 0.0001,
		usedFallback: false,
	};
}

const brand: BrandProfile = {
	...defaultBrand,
	id: "brand-test",
	name: "Marca Test",
	colors: ["#112233", "#FFAA00"],
};

const piece: ContentPiece = {
	id: "piece-1",
	title: "Crecimos 300% en un mes",
	body: "Nuestros clientes crecen 300% garantizado.",
	format: "post",
	channel: "linkedin",
	author: "Copy",
	createdAt: "2026-10-01T00:00:00.000Z",
};

const ORIGINAL_IMAGE = "data:image/png;base64,iVBORw0KGgo=";
const NEW_IMAGE = "data:image/png;base64,AAAAAAAA";

/** First decision: unsourced claims (gray zone). Second and later: clean. */
function fakeDeps(overrides: Partial<RegenerateDeps> = {}) {
	const requests: DecisionRequest[] = [];
	const rewrites: RewriteInput[] = [];
	const images: ImageRegenerationInput[] = [];
	const deps: RegenerateDeps = {
		decide: async (request) => {
			requests.push(request);
			return decision(answers(requests.length === 1 ? 0.9 : 0.05));
		},
		rewrite: async (input) => {
			rewrites.push(input);
			return {
				title: "Cómo crecer con método",
				body: "Te contamos cómo crecimos [FUENTE].",
				changes: ["Quitamos la cifra sin fuente.", "Quitamos la promesa garantizada."],
			};
		},
		regenerateImage: async (input) => {
			images.push(input);
			return NEW_IMAGE;
		},
		...overrides,
	};
	return { deps, requests, rewrites, images };
}

describe("regeneratePiece", () => {
	it("passes the failed checks, answers and brand to the rewriter", async () => {
		const { deps, rewrites } = fakeDeps();
		await regeneratePiece({ piece, brand }, deps);

		assert.equal(rewrites.length, 1);
		const [input] = rewrites;
		assert.equal(input?.brand.id, "brand-test");
		assert.equal(input?.title, piece.title);
		assert.equal(input?.format, "post");
		assert.ok((input?.failedChecks.length ?? 0) > 0, "failed checks are forwarded");
		assert.ok(input?.answersSummary.some((line) => line.startsWith("unsourced_claims: sí")));
		assert.equal(input?.imageDataUrl, undefined);
	});

	it("returns the rewritten copy with JEV's NEW review", async () => {
		const { deps, requests, images } = fakeDeps();
		const proposal = await regeneratePiece({ piece, brand }, deps);

		assert.equal(requests.length, 2, "original review + review of the new version");
		assert.equal(proposal.title, "Cómo crecer con método");
		assert.equal(proposal.body, "Te contamos cómo crecimos [FUENTE].");
		assert.equal(proposal.changes.length, 2);
		assert.equal(proposal.review.piece.body, proposal.body);
		assert.equal(proposal.review.route, "AUTO_APPROVE");
		assert.equal(proposal.review.brandId, "brand-test");
		assert.equal(proposal.imageDataUrl, undefined);
		assert.equal(images.length, 0, "text-only pieces get no image");
		assert.ok(
			JSON.stringify(requests[1]?.input).includes("Te contamos"),
			"JEV reviews the rewritten text",
		);
	});

	it("reuses a given previous review instead of reviewing the original again", async () => {
		const first = fakeDeps();
		const previous = (await regeneratePiece({ piece, brand }, first.deps)).review;
		const { deps, requests, rewrites } = fakeDeps();
		await regeneratePiece({ piece, brand, previousReview: { ...previous, reasons: [] } }, deps);
		assert.equal(requests.length, 1, "only the new version is reviewed");
		assert.deepEqual(rewrites[0]?.failedChecks, []);
	});

	it("maps a rewrite failure to RegenerationFailedError", async () => {
		const { deps } = fakeDeps({
			rewrite: async () => {
				throw new Error("boom");
			},
		});
		await assert.rejects(regeneratePiece({ piece, brand }, deps), RegenerationFailedError);
	});

	it("treats an empty rewrite as a failure", async () => {
		const { deps } = fakeDeps({ rewrite: async () => ({ title: "x", body: " ", changes: [] }) });
		await assert.rejects(regeneratePiece({ piece, brand }, deps), RegenerationFailedError);
	});

	it("throws RegenerationNotConfiguredError without a rewriter", async () => {
		const { deps } = fakeDeps({ rewrite: undefined });
		await assert.rejects(regeneratePiece({ piece, brand }, deps), RegenerationNotConfiguredError);
	});

	it("redraws a screenshot with the brand colors and rewritten copy, and JEV judges it", async () => {
		const { deps, images, rewrites, requests } = fakeDeps();
		const proposal = await regeneratePiece(
			{ piece: { ...piece, imageDataUrl: ORIGINAL_IMAGE }, brand },
			deps,
		);

		assert.equal(rewrites[0]?.imageDataUrl, ORIGINAL_IMAGE);
		assert.equal(images.length, 1);
		assert.equal(images[0]?.imageDataUrl, ORIGINAL_IMAGE);
		assert.deepEqual(images[0]?.brand.colors, ["#112233", "#FFAA00"]);
		assert.equal(images[0]?.title, "Cómo crecer con método");
		assert.equal(images[0]?.body, "Te contamos cómo crecimos [FUENTE].");
		assert.equal(proposal.imageDataUrl, NEW_IMAGE);
		assert.equal(requests[1]?.image?.base64, "AAAAAAAA", "JEV sees the new image");
		assert.ok(!proposal.changes.includes(IMAGE_NOT_REGENERATED_NOTE));
	});

	it("still returns the text proposal with a note when the image fails", async () => {
		const { deps, requests } = fakeDeps({
			regenerateImage: async () => {
				throw new Error("timeout");
			},
		});
		const proposal = await regeneratePiece(
			{ piece: { ...piece, imageDataUrl: ORIGINAL_IMAGE }, brand },
			deps,
		);

		assert.equal(proposal.imageDataUrl, undefined);
		assert.equal(proposal.body, "Te contamos cómo crecimos [FUENTE].");
		assert.equal(proposal.changes.at(-1), IMAGE_NOT_REGENERATED_NOTE);
		assert.equal(requests[1]?.image?.base64, "iVBORw0KGgo=", "JEV judges the kept original");
	});
});
