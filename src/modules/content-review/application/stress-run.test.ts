import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionAnswer, DecisionRequest, DecisionResult } from "../domain/decision";

// Same resolver hook as review-piece.test.ts: retry extensionless relative imports with ".ts".
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

const { buildStressPieces, percentile, runStress } = (await import(
	new URL("./stress-run.ts", import.meta.url).href
)) as typeof import("./stress-run");

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

const spamAnswers = {
	topic: choice("topic_2"),
	format: choice("post"),
	relevance: score(0),
	actionable: score(0),
	too_promotional: yesNo(0.99),
	exaggerated_promises: yesNo(0.99),
	unsourced_claims: yesNo(0.99),
	brand_risk: yesNo(0.99),
	offers_unsold_product: yesNo(0.99),
	is_spam: yesNo(0.99),
};

const seed: ContentPiece[] = [1, 2, 3].map((n) => ({
	id: `cp-00${n}`,
	title: `Título ${n}`,
	body: `Texto ${n}`,
	format: "post",
	channel: "linkedin",
	author: "Equipo Media 30X",
	createdAt: "2026-10-01T09:00:00.000Z",
	imagePath: `/samples/cp-00${n}.jpg`,
	imageDataUrl: "data:image/png;base64,AAAA",
	expectedRoute: "AUTO_APPROVE",
}));

function decision(overrides: Partial<DecisionResult> = {}): DecisionResult {
	return {
		answers: spamAnswers,
		provider: "jev",
		model: "jev-latest",
		latencyMs: 100,
		inputTokens: 500,
		costUsd: 0.0001,
		usedFallback: false,
		...overrides,
	};
}

describe("buildStressPieces", () => {
	it("cycles the seed with unique ids and varied text, text only", () => {
		const pieces = buildStressPieces(seed, 10, "run1");
		assert.equal(pieces.length, 10);
		assert.equal(new Set(pieces.map((p) => p.id)).size, 10);
		assert.equal(new Set(pieces.map((p) => p.body)).size, 10);
		assert.equal(pieces[0].id, "stress-run1-1");
		assert.equal(pieces[3].title, seed[0].title);
		assert.ok(pieces[3].body.startsWith(seed[0].body));
		for (const piece of pieces) {
			assert.equal(piece.imagePath, undefined);
			assert.equal(piece.imageDataUrl, undefined);
			assert.equal(piece.expectedRoute, undefined);
		}
	});

	it("returns nothing without seed pieces", () => {
		assert.deepEqual(buildStressPieces([], 5, "x"), []);
	});
});

describe("percentile", () => {
	it("uses nearest rank", () => {
		const values = Array.from({ length: 100 }, (_, i) => i + 1);
		assert.equal(percentile(values, 0.5), 50);
		assert.equal(percentile(values, 0.95), 95);
		assert.equal(percentile([7], 0.95), 7);
		assert.equal(percentile([], 0.5), 0);
	});
});

describe("runStress", () => {
	it("computes throughput, percentiles, cost, routes and providers", async () => {
		let clock = 0;
		let calls = 0;
		const inputs: string[] = [];
		const report = await runStress(
			{ count: 20, runId: "t" },
			{
				content: seed,
				now: () => clock,
				async decide(request: DecisionRequest) {
					const index = calls++;
					inputs.push(JSON.stringify(request.input));
					assert.equal(request.image, undefined);
					if (index === 19) {
						clock = 2000; // the run "takes" 2 s
						throw new Error("boom");
					}
					// Latencies 10, 20, ..., 190 ms; the last 4 answered by the fallback.
					return decision({
						latencyMs: (index + 1) * 10,
						provider: index >= 15 ? "openai" : "jev",
						usedFallback: index >= 15,
						costUsd: 0.001,
					});
				},
			},
		);

		assert.equal(new Set(inputs).size, 20);
		assert.equal(report.requested, 20);
		assert.equal(report.count, 20);
		assert.equal(report.partial, false);
		assert.equal(report.totalMs, 2000);
		assert.equal(report.decisionsPerSecond, 10);
		assert.equal(report.failures, 1);
		// 19 successes: p50 = 10th = 100 ms, p95 = ceil(18.05) = 19th = 190 ms.
		assert.equal(report.p50Ms, 100);
		assert.equal(report.p95Ms, 190);
		assert.ok(Math.abs(report.totalCostUsd - 0.019) < 1e-12);
		assert.ok(Math.abs(report.costPer1kUsd - 1) < 1e-9);
		assert.deepEqual(report.providers, { jev: 15, openai: 4 });
		assert.equal(report.fallbackCount, 4);
		assert.equal(report.byRoute.REJECT, 19);
		assert.equal(report.byRoute.HUMAN_REVIEW, 1);
	});

	it("never has more than `concurrency` decisions in flight", async () => {
		let inFlight = 0;
		let peak = 0;
		const report = await runStress(
			{ count: 50, concurrency: 4, runId: "c" },
			{
				content: seed,
				async decide() {
					inFlight++;
					peak = Math.max(peak, inFlight);
					await new Promise((resolve) => setTimeout(resolve, 2));
					inFlight--;
					return decision();
				},
			},
		);
		assert.equal(report.count, 50);
		assert.equal(peak, 4);
	});

	it("stops launching at the soft deadline and reports the partial count", async () => {
		let clock = 0;
		const report = await runStress(
			{ count: 100, concurrency: 2, softDeadlineMs: 1000, runId: "d" },
			{
				content: seed,
				now: () => clock,
				async decide() {
					clock += 100;
					return decision();
				},
			},
		);
		assert.ok(report.count < 100);
		assert.equal(report.partial, true);
		assert.equal(report.requested, 100);
	});
});
