import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionAnswer, DecisionImage, DecisionRequest } from "../domain/decision";
import type { ReviewBatchDeps } from "./review-batch";

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

const { reviewBatch } = (await import(
	new URL("./review-batch.ts", import.meta.url).href
)) as typeof import("./review-batch");

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

const answers = {
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
};

const samplePiece: ContentPiece = {
	id: "cp-001",
	title: "Título",
	body: "Texto de prueba",
	format: "post",
	channel: "instagram",
	author: "Equipo Media 30X",
	createdAt: "2026-10-01T09:00:00.000Z",
	imagePath: "/samples/cp-001.jpg",
	expectedRoute: "AUTO_APPROVE",
};

const JPEG: DecisionImage = { mimeType: "image/jpeg", base64: "/9j/4AAQSkZJRgABAQAAAQABAAD/" };

function fakeDeps(loadImage?: ReviewBatchDeps["loadImage"]) {
	const requests: DecisionRequest[] = [];
	const loaded: string[] = [];
	const deps: ReviewBatchDeps = {
		content: [samplePiece],
		decide: async (request) => {
			requests.push(request);
			return {
				answers,
				provider: "jev",
				model: "test-model",
				latencyMs: 100,
				inputTokens: 200,
				costUsd: 0.0001,
				usedFallback: false,
			};
		},
		...(loadImage
			? {
					loadImage: async (path: string) => {
						loaded.push(path);
						return loadImage(path);
					},
				}
			: {}),
	};
	return { deps, requests, loaded };
}

describe("reviewBatch with sample images", () => {
	it("sends the bundled sample image to the decision engine", async () => {
		const { deps, requests, loaded } = fakeDeps(async () => JPEG);
		const { results } = await reviewBatch({}, deps);
		assert.deepEqual(loaded, ["/samples/cp-001.jpg"]);
		assert.deepEqual(requests[0]?.image, JPEG);
		assert.equal(results[0]?.route, "AUTO_APPROVE");
		// The response keeps the original piece (imagePath only, no base64 copy).
		assert.equal(results[0]?.piece.imageDataUrl, undefined);
		assert.equal(results[0]?.piece.imagePath, "/samples/cp-001.jpg");
	});

	it("reviews text-only when the image is missing", async () => {
		const { deps, requests } = fakeDeps(async () => null);
		const { results } = await reviewBatch({}, deps);
		assert.equal(requests[0]?.image, undefined);
		assert.equal(results[0]?.route, "AUTO_APPROVE");
		assert.equal(results[0]?.error, undefined);
	});

	it("reviews text-only when the loader throws or is not wired", async () => {
		const failing = fakeDeps(async () => {
			throw new Error("disk error");
		});
		await reviewBatch({}, failing.deps);
		assert.equal(failing.requests[0]?.image, undefined);

		const unwired = fakeDeps();
		await reviewBatch({}, unwired.deps);
		assert.equal(unwired.requests[0]?.image, undefined);
	});

	it("prefers the piece's own screenshot over the sample image", async () => {
		const { deps, requests, loaded } = fakeDeps(async () => JPEG);
		const png =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
		deps.content = [{ ...samplePiece, imageDataUrl: `data:image/png;base64,${png}` }];
		await reviewBatch({}, deps);
		assert.equal(loaded.length, 0);
		assert.equal(requests[0]?.image?.mimeType, "image/png");
	});
});
