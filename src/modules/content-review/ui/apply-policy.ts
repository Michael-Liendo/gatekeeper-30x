import { decideRoute, type EditorialPolicy } from "../domain/editorial-policy";
import type { ReviewResult } from "../domain/review";

/**
 * Re-routes an already reviewed piece with a different policy, reusing the typed
 * answers the model gave. No model call: this is what makes the sliders instant.
 */
export function applyPolicy(result: ReviewResult, policy: EditorialPolicy): ReviewResult {
	const hasAnswers = Object.keys(result.answers ?? {}).length > 0;
	// Without answers there is nothing to recompute: keep the server's verdict and reasons.
	if (result.error || !hasAnswers) return result;

	const decision = decideRoute(result.answers, policy);
	const expected = result.piece.expectedRoute;
	return {
		...result,
		route: decision.route,
		editorialScore: decision.editorialScore,
		minConfidence: decision.minConfidence,
		reasons: decision.reasons,
		matchesExpected: expected ? expected === decision.route : undefined,
	};
}

/** True when both policies have the same thresholds and weights. */
export function isSamePolicy(a: EditorialPolicy, b: EditorialPolicy): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
