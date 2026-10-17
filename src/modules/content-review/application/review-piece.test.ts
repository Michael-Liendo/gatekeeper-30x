import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionAnswer, DecisionResult } from "../domain/decision";
import type { EditorialSuggestions } from "../domain/review";
import type { ReviewDeps, SuggestInput } from "./review-piece";

// review-piece.ts imports its siblings without an extension (as tsc and the bundler
// expect). Node's ESM resolver needs the extension, so retry relative specifiers with ".ts".
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

// Loaded by URL so the same file runs under `node --test` (which needs the .ts extension)
// and type-checks under tsc (which rejects .ts extensions in static imports).
const reviewModule = new URL("./review-piece.ts", import.meta.url).href;
const { reviewPiece, suggestFixesForPiece, DECISION_UNAVAILABLE_MESSAGE } = (await import(
	reviewModule
)) as typeof import("./review-piece");

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

/** Clean, relevant, actionable answers that auto-approve under the default policy. */
function goodAnswers(overrides: Record<string, DecisionAnswer> = {}) {
	return {
		topic: choice("sales"),
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

function decision(answers: Record<string, DecisionAnswer>): DecisionResult {
	return {
		answers,
		provider: "jev",
		model: "test-model",
		latencyMs: 120,
		inputTokens: 300,
		costUsd: 0.0001,
		usedFallback: false,
	};
}

const piece: ContentPiece = {
	id: "cp-test",
	title: "Título",
	body: "Texto de prueba",
	format: "post",
	channel: "linkedin",
	author: "Equipo Media 30X",
	createdAt: "2026-10-01T09:00:00.000Z",
	expectedRoute: "AUTO_APPROVE",
};

const suggestions: EditorialSuggestions = {
	suggestedTitle: "Mejor título",
	summary: ["a", "b", "c"],
	fixes: ["Quitar el tono promocional"],
};

function fakeDeps(answers: Record<string, DecisionAnswer>) {
	const calls: SuggestInput[] = [];
	const deps: ReviewDeps = {
		decide: async () => decision(answers),
		suggest: async (input) => {
			calls.push(input);
			return suggestions;
		},
	};
	return { deps, calls };
}

describe("reviewPiece", () => {
	it("routes to HUMAN_REVIEW with an error when the engine fails, without inventing answers", async () => {
		const deps: ReviewDeps = {
			decide: async () => {
				throw new Error("provider down");
			},
		};
		const result = await reviewPiece(piece, {}, deps);
		assert.equal(result.route, "HUMAN_REVIEW");
		assert.equal(result.error, DECISION_UNAVAILABLE_MESSAGE);
		assert.deepEqual(result.answers, {});
		assert.equal(result.provider, null);
		assert.equal(result.model, null);
		assert.equal(result.matchesExpected, false);
	});

	it("auto-approves good answers and reports the decision metadata", async () => {
		const { deps, calls } = fakeDeps(goodAnswers());
		const result = await reviewPiece(piece, { enrich: true }, deps);
		assert.equal(result.route, "AUTO_APPROVE");
		assert.equal(result.matchesExpected, true);
		assert.equal(result.provider, "jev");
		assert.equal(result.latencyMs, 120);
		assert.equal(result.suggestions, undefined);
		assert.equal(calls.length, 0, "suggest is only called for ENRICH_WITH_LLM");
	});

	it("calls suggest with the failed checks for ENRICH_WITH_LLM when enrich is on", async () => {
		const { deps, calls } = fakeDeps(goodAnswers({ too_promotional: yesNo(0.91) }));
		const result = await reviewPiece(piece, { enrich: true }, deps);
		assert.equal(result.route, "ENRICH_WITH_LLM");
		assert.deepEqual(result.suggestions, suggestions);
		assert.equal(calls.length, 1);
		assert.ok(calls[0]?.failedChecks.includes("Demasiado promocional (0,91)"));
	});

	it("does not call suggest when enrich is off", async () => {
		const { deps, calls } = fakeDeps(goodAnswers({ too_promotional: yesNo(0.91) }));
		const result = await reviewPiece(piece, {}, deps);
		assert.equal(result.route, "ENRICH_WITH_LLM");
		assert.equal(result.suggestions, undefined);
		assert.equal(calls.length, 0);
	});

	it("keeps the result without suggestions when the LLM fails", async () => {
		const deps: ReviewDeps = {
			decide: async () => decision(goodAnswers({ too_promotional: yesNo(0.91) })),
			suggest: async () => {
				throw new Error("llm down");
			},
		};
		const result = await reviewPiece(piece, { enrich: true }, deps);
		assert.equal(result.route, "ENRICH_WITH_LLM");
		assert.equal(result.suggestions, undefined);
		assert.equal(result.error, undefined);
	});

	it("applies policy overrides, including a single weight", async () => {
		const { deps } = fakeDeps(goodAnswers());
		const strict = await reviewPiece(piece, { policy: { autoApproveConfidence: 0.99 } }, deps);
		assert.equal(strict.route, "ENRICH_WITH_LLM");

		// Halving relevance's weight: 0.25 + 0.5 − 0.025 − 0.025 = 0.7 < 0.75.
		const reweighted = await reviewPiece(piece, { policy: { weights: { relevance: 0.25 } } }, deps);
		assert.equal(reweighted.route, "ENRICH_WITH_LLM");
		assert.ok(reweighted.reasons.some((r) => r.check === "editorial_score"));
	});

	it("omits matchesExpected when the piece has no expected route", async () => {
		const { deps } = fakeDeps(goodAnswers());
		const { expectedRoute: _, ...custom } = piece;
		const result = await reviewPiece(custom, {}, deps);
		assert.equal("matchesExpected" in result, false);
	});
});

describe("suggestFixesForPiece", () => {
	it("throws when no LLM is configured", async () => {
		await assert.rejects(
			suggestFixesForPiece(piece, {}, { decide: async () => decision(goodAnswers()) }),
			{ name: "SuggestionsNotConfiguredError" },
		);
	});
});
