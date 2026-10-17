import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DecisionAnswer } from "./decision";

// Loaded by URL so the same file runs under `node --test` (which needs the .ts extension)
// and type-checks under tsc (which rejects .ts extensions in static imports).
const policyModule = new URL("./editorial-policy.ts", import.meta.url).href;
const { decideRoute, defaultEditorialPolicy, failedChecks } = (await import(
	policyModule
)) as typeof import("./editorial-policy");

/**
 * Rule tests pin their own thresholds so they don't depend on the calibrated
 * defaults, which change whenever the policy is re-tuned.
 */
const testPolicy = {
	...defaultEditorialPolicy,
	autoApproveConfidence: 0.85,
	grayZoneFloor: 0.6,
	riskBlock: 0.7,
	spamReject: 0.85,
	minEditorialScore: 0.75,
	flagThreshold: 0.5,
};

type Answers = Record<string, DecisionAnswer>;

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

/** A clean, relevant, actionable post that should auto-approve. */
function goodAnswers(overrides: Answers = {}): Answers {
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

describe("decideRoute", () => {
	it("auto-approves a confident, clean, high-scoring piece", () => {
		const result = decideRoute(goodAnswers(), testPolicy);
		assert.equal(result.route, "AUTO_APPROVE");
		assert.deepEqual(result.reasons, []);
		assert.ok(result.editorialScore >= testPolicy.minEditorialScore);
		assert.ok(result.minConfidence >= 0.85);
	});

	it("rejects spam above the spam threshold", () => {
		const result = decideRoute(goodAnswers({ is_spam: yesNo(0.95) }), testPolicy);
		assert.equal(result.route, "REJECT");
		assert.equal(result.reasons[0]?.check, "is_spam");
		assert.equal(result.reasons[0]?.message, "Spam (0,95)");
	});

	it("rejects confident off-topic content with spam signals", () => {
		const result = decideRoute(
			goodAnswers({ topic: choice("other", 0.92), is_spam: yesNo(0.6) }),
			testPolicy,
		);
		assert.equal(result.route, "REJECT");
	});

	it("rejects spam even when there is also brand risk", () => {
		const result = decideRoute(
			goodAnswers({ is_spam: yesNo(0.9), brand_risk: yesNo(0.9) }),
			testPolicy,
		);
		assert.equal(result.route, "REJECT");
	});

	for (const key of ["brand_risk", "exaggerated_promises", "offers_unsold_product"]) {
		it(`sends ${key} ≥ riskBlock to human review`, () => {
			const result = decideRoute(goodAnswers({ [key]: yesNo(0.8) }), testPolicy);
			assert.equal(result.route, "HUMAN_REVIEW");
			assert.ok(result.reasons.some((r) => r.check === key));
		});
	}

	it("sends low confidence to human review", () => {
		const result = decideRoute(goodAnswers({ relevance: score(2, 0.4) }), testPolicy);
		assert.equal(result.route, "HUMAN_REVIEW");
		assert.equal(result.minConfidence, 0.4);
	});

	it("treats an uncertain yes/no (p ≈ 0.5) as low confidence", () => {
		const result = decideRoute(goodAnswers({ unsourced_claims: yesNo(0.45) }), testPolicy);
		assert.equal(result.route, "HUMAN_REVIEW");
		assert.equal(result.minConfidence, 0.55);
	});

	it('sends topic "other" without spam to human review', () => {
		const result = decideRoute(goodAnswers({ topic: choice("other") }), testPolicy);
		assert.equal(result.route, "HUMAN_REVIEW");
		assert.ok(result.reasons.some((r) => r.check === "topic"));
	});

	it("enriches a gray-zone confidence piece with the LLM", () => {
		const result = decideRoute(goodAnswers({ actionable: score(2, 0.7) }), testPolicy);
		assert.equal(result.route, "ENRICH_WITH_LLM");
	});

	it("enriches a confident but too promotional piece with the LLM", () => {
		const result = decideRoute(goodAnswers({ too_promotional: yesNo(0.91) }), testPolicy);
		assert.equal(result.route, "ENRICH_WITH_LLM");
		assert.ok(failedChecks(result.reasons).includes("Demasiado promocional (0,91)"));
	});

	it("enriches a confident piece with a low editorial score", () => {
		const result = decideRoute(
			goodAnswers({ relevance: score(1), actionable: score(1) }),
			testPolicy,
		);
		assert.equal(result.route, "ENRICH_WITH_LLM");
		assert.ok(result.reasons.some((r) => r.check === "editorial_score"));
	});

	it("computes the editorial score from the documented formula", () => {
		// 0.5 × 1 + 0.5 × 0.5 − 0.5 × 0.2 − 0.5 × 0.1 = 0.6
		const result = decideRoute(
			goodAnswers({
				actionable: score(1),
				too_promotional: yesNo(0.2),
				unsourced_claims: yesNo(0.1),
			}),
			testPolicy,
		);
		assert.ok(Math.abs(result.editorialScore - 0.6) < 1e-9);
	});

	it("respects tuned thresholds", () => {
		const strict = { ...testPolicy, autoApproveConfidence: 0.99 };
		assert.equal(decideRoute(goodAnswers(), strict).route, "ENRICH_WITH_LLM");
	});

	describe("missing or invalid answers → HUMAN_REVIEW", () => {
		it("when there are no answers at all", () => {
			assert.equal(decideRoute({}, testPolicy).route, "HUMAN_REVIEW");
			assert.equal(decideRoute(null, testPolicy).route, "HUMAN_REVIEW");
		});

		it("when one answer is missing", () => {
			const answers = goodAnswers();
			delete answers.brand_risk;
			const result = decideRoute(answers, testPolicy);
			assert.equal(result.route, "HUMAN_REVIEW");
			assert.deepEqual(
				result.reasons.map((r) => r.check),
				["missing_brand_risk"],
			);
		});

		it("when an answer has the wrong type", () => {
			const result = decideRoute(goodAnswers({ relevance: yesNo(0.9) }), testPolicy);
			assert.equal(result.route, "HUMAN_REVIEW");
		});

		it("when a probability is out of range or NaN", () => {
			assert.equal(
				decideRoute(goodAnswers({ is_spam: yesNo(Number.NaN) }), testPolicy).route,
				"HUMAN_REVIEW",
			);
			assert.equal(
				decideRoute(goodAnswers({ brand_risk: yesNo(1.4) }), testPolicy).route,
				"HUMAN_REVIEW",
			);
		});
	});
});
