import "server-only";
import { cachedDecide } from "@/modules/content-review/infrastructure/decision-cache";
import { getDecisionEngine } from "@/modules/content-review/infrastructure/decision-engine";
import type { SegmentBatchDeps } from "../application/segment-batch";
import type { SegmentDeps } from "../application/segment-profile";
import { loadProfiles } from "./profile-dataset";

/**
 * The same decision engine as content review (JEV, with OpenAI Decisions as fallback),
 * cached per request so re-runs and recalculations are free.
 */
export function getSegmentEngineDeps(): SegmentDeps {
	return {
		// getDecisionEngine() throws when no provider is configured; segmentProfile turns
		// that into a failed result routed to human review.
		decide: (request) =>
			cachedDecide(request, "segment", async (r) => getDecisionEngine().decide(r)),
	};
}

/** Engine plus 30X's profile sheet (parsed once). Throws if the sheet is missing. */
export function getSegmentDeps(): SegmentBatchDeps {
	return { ...getSegmentEngineDeps(), profiles: loadProfiles() };
}
