import "server-only";
import { env } from "@/shared/config/env";
import type { ReviewBatchDeps } from "../application/review-batch";
import { cachedDecide } from "./decision-cache";
import { getDecisionEngine } from "./decision-engine";
import { suggestEditorialFixes } from "./openai-llm";
import { sampleContent } from "./sample-content";

/**
 * Pasted pieces get a fresh `custom-<timestamp>` id on every request; share one
 * namespace so reviewing and then enriching the same text hits the cache.
 */
function cacheNamespace(pieceId: string | undefined): string | undefined {
	return pieceId?.startsWith("custom-") ? "custom" : pieceId;
}

/** Real adapters for the review use cases: cached decision engine, OpenAI fixer, sample data. */
export function getReviewDeps(): ReviewBatchDeps {
	return {
		content: sampleContent,
		// getDecisionEngine() throws when no provider is configured; inside decide() that
		// becomes a per-piece failure and the use case routes it to human review.
		decide: (request, pieceId) =>
			cachedDecide(request, cacheNamespace(pieceId), async (r) => getDecisionEngine().decide(r)),
		suggest: env.OPENAI_API_KEY ? (input) => suggestEditorialFixes(input) : undefined,
	};
}
