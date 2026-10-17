import type { ContentPiece } from "./content-piece";
import type { DecisionAnswer, DecisionProvider } from "./decision";
import type { EditorialPolicy, Reason, Route } from "./editorial-policy";

/** Editorial suggestions produced by the LLM (System Two) in the gray zone. */
export interface EditorialSuggestions {
	suggestedTitle: string;
	summary: string[];
	fixes: string[];
}

/** Full outcome of reviewing one piece. Shared by the API and the panel. */
export interface ReviewResult {
	piece: ContentPiece;
	route: Route;
	editorialScore: number;
	minConfidence: number;
	reasons: Reason[];
	answers: Record<string, DecisionAnswer>;
	/** null when no provider could answer (route is then HUMAN_REVIEW). */
	provider: DecisionProvider | null;
	model: string | null;
	usedFallback: boolean;
	latencyMs: number;
	inputTokens: number | null;
	costUsd: number | null;
	/** Present only when route is ENRICH_WITH_LLM and the LLM call succeeded. */
	suggestions?: EditorialSuggestions;
	/** Spanish, user-facing; set when the decision engine failed. */
	error?: string;
	/** Matches the simulated `expectedRoute`, when there is one. */
	matchesExpected?: boolean;
}

/** Aggregate KPIs for a batch of reviews. */
export interface ReviewMetrics {
	total: number;
	byRoute: Record<Route, number>;
	/** Share of pieces resolved without a person (AUTO_APPROVE + REJECT). */
	automationRate: number;
	/** Share of pieces that reached a person (HUMAN_REVIEW). */
	escalationRate: number;
	/** Share matching `expectedRoute` among pieces that have one. */
	accuracy: number | null;
	avgLatencyMs: number;
	totalCostUsd: number;
	/** Cost projected to 1,000 pieces at the observed average. */
	costPer1kUsd: number;
	fallbackCount: number;
}

export interface ReviewBatchRequest {
	/** Piece ids from the sample dataset; all pieces when omitted. */
	ids?: string[];
	/** Partial overrides of the default thresholds (live tuning in the panel). */
	policy?: Partial<EditorialPolicy>;
	/** Ask the LLM for suggestions on ENRICH_WITH_LLM pieces. Default false. */
	enrich?: boolean;
}

export interface ReviewBatchResponse {
	results: ReviewResult[];
	metrics: ReviewMetrics;
}
