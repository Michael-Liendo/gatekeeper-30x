import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { DecisionAnswer } from "../../content-review/domain/decision";

// Retry extensionless relative imports with ".ts" (same hook as the content-review tests).
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

const { decideSegment, defaultSegmentPolicy } = (await import(
	new URL("./segment-policy.ts", import.meta.url).href
)) as typeof import("./segment-policy");

function answers({
	program = "ai_sales",
	confidence = 0.8,
	seniority = 2,
	maturity = 1,
	salesReady = 0.8,
	hasContext = 0.9,
}: {
	program?: string;
	confidence?: number;
	seniority?: number;
	maturity?: number;
	salesReady?: number;
	hasContext?: number;
} = {}): Record<string, DecisionAnswer> {
	return {
		program: {
			type: "choice",
			choice: program,
			confidence,
			probabilities: { [program]: confidence },
		},
		seniority: { type: "score", score: seniority, confidence: 0.9, probabilities: [0, 0, 1] },
		ai_maturity: { type: "score", score: maturity, confidence: 0.9, probabilities: [0, 1, 0] },
		sales_ready: { type: "yes_no", probability: salesReady },
		has_context: { type: "yes_no", probability: hasContext },
	};
}

describe("decideSegment", () => {
	it("sends a ready, senior person with a clear program to an advisor", () => {
		const decision = decideSegment(answers());
		assert.equal(decision.program, "ai_sales");
		assert.equal(decision.action, "ADVISOR");
		assert.equal(decision.label, "Dueño · IA media · AI Sales");
	});

	it("sends the program proposal when the person isn't senior enough", () => {
		const decision = decideSegment(answers({ seniority: 1 }));
		assert.equal(decision.program, "ai_sales");
		assert.equal(decision.action, "PROPOSAL");
	});

	it("does not assign a program below the confidence threshold and nurtures instead", () => {
		const decision = decideSegment(
			answers({ confidence: defaultSegmentPolicy.programConfidence - 0.05 }),
		);
		assert.equal(decision.program, "none");
		assert.equal(decision.engineChoice, "ai_sales");
		assert.equal(decision.action, "NURTURE");
	});

	it("nurtures profiles with little context even if a program fits", () => {
		const decision = decideSegment(answers({ salesReady: 0.1, hasContext: 0.2 }));
		assert.equal(decision.program, "ai_sales");
		assert.equal(decision.action, "NURTURE");
	});

	it("nurtures when the engine says there is no clear program", () => {
		const decision = decideSegment(answers({ program: "none", confidence: 0.9 }));
		assert.equal(decision.program, "none");
		assert.equal(decision.action, "NURTURE");
	});

	it("routes to a person below the review floor", () => {
		const decision = decideSegment(answers({ confidence: defaultSegmentPolicy.reviewFloor / 2 }));
		assert.equal(decision.action, "HUMAN_REVIEW");
	});

	it("routes to a person when answers are missing or unknown", () => {
		assert.equal(decideSegment(null).action, "HUMAN_REVIEW");
		assert.equal(decideSegment(answers({ program: "made_up" })).action, "HUMAN_REVIEW");
	});

	it("reads thresholds from the policy passed in", () => {
		const strict = { ...defaultSegmentPolicy, salesReady: 0.95 };
		assert.equal(decideSegment(answers(), strict).action, "PROPOSAL");
	});
});
