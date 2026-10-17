import "server-only";
import { env } from "@/shared/config/env";
import type { ReviewBatchDeps } from "../application/review-batch";
import { cachedDecide } from "./decision-cache";
import { getDecisionEngine } from "./decision-engine";
import { suggestEditorialFixes } from "./openai-llm";
import { sampleContent } from "./sample-content";

/** Real adapters for the review use cases: cached decision engine, OpenAI fixer, sample data. */
export function getReviewDeps(): ReviewBatchDeps {
	return {
		content: sampleContent,
		// getDecisionEngine() throws when no provider is configured; inside decide() that
		// becomes a per-piece failure and the use case routes it to human review.
		// `cacheKey` already scopes by piece and brand version (see `decisionCacheKey`).
		decide: (request, cacheKey) =>
			cachedDecide(request, cacheKey, async (r) => getDecisionEngine().decide(r)),
		suggest: env.OPENAI_API_KEY ? (input) => suggestEditorialFixes(input) : undefined,
	};
}
