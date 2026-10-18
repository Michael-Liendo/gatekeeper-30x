import type { ReviewMetrics } from "./review";

/**
 * Assumptions behind "time the team gets back". Data, not code: the Media team can tune
 * them to its own reality.
 */
export interface TeamTimeConfig {
	/** Minutes a person spends reviewing one piece by hand. */
	minutesPerManualReview: number;
	/** The figure is shown per this many pieces so it reads the same for any batch size. */
	perPieces: number;
}

export const TEAM_TIME: TeamTimeConfig = {
	minutesPerManualReview: 5,
	perPieces: 100,
};

/**
 * Hours the team stops spending on review per `perPieces` pieces: every piece resolved
 * without a person (approved or discarded on its own) is a manual review nobody does.
 */
export function hoursRecoveredPer(
	metrics: Pick<ReviewMetrics, "automationRate">,
	config: TeamTimeConfig = TEAM_TIME,
): number {
	const minutes = metrics.automationRate * config.perPieces * config.minutesPerManualReview;
	return minutes / 60;
}
