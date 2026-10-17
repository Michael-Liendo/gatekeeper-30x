import { parseImageDataUrl } from "../domain/content-image";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionImage, DecisionRequest, DecisionResult } from "../domain/decision";
import {
	decideRoute,
	defaultEditorialPolicy,
	type EditorialPolicy,
	failedChecks,
} from "../domain/editorial-policy";
import { buildContentInput, editorialQuestions } from "../domain/editorial-questions";
import type { EditorialSuggestions, ReviewResult } from "../domain/review";

/** Input for the "System Two" LLM that proposes editorial fixes. */
export interface SuggestInput {
	title: string;
	body: string;
	/** Human-readable descriptions of the checks the content failed. */
	failedChecks: string[];
	/** Screenshot of the piece, when it was submitted as an image. */
	image?: DecisionImage;
}

/** Ports the review use cases depend on. Infrastructure wires the real ones. */
export interface ReviewDeps {
	/** Answers the editorial questions. `pieceId` lets the adapter cache per piece. */
	decide(request: DecisionRequest, pieceId?: string): Promise<DecisionResult>;
	/** Absent when no LLM is configured; enrichment is then skipped. */
	suggest?(input: SuggestInput): Promise<EditorialSuggestions>;
}

export interface ReviewOptions {
	/** Partial overrides of the default thresholds and weights. */
	policy?: PolicyOverrides;
	/** Ask the LLM for suggestions when the route is ENRICH_WITH_LLM. Default false. */
	enrich?: boolean;
}

/** Like `Partial<EditorialPolicy>`, but weights can also be overridden one by one. */
export type PolicyOverrides = Partial<Omit<EditorialPolicy, "weights">> & {
	weights?: Partial<EditorialPolicy["weights"]>;
};

export const DECISION_UNAVAILABLE_MESSAGE =
	"No se pudo obtener una decisión: va a revisión humana.";

/** Thrown by `suggestFixesForPiece` when no LLM is configured. */
export class SuggestionsNotConfiguredError extends Error {
	constructor() {
		super("No LLM configured for editorial suggestions");
		this.name = "SuggestionsNotConfiguredError";
	}
}

/** Default policy with the given overrides applied (weights merged key by key). */
export function mergePolicy(overrides: PolicyOverrides = {}): EditorialPolicy {
	return {
		...defaultEditorialPolicy,
		...overrides,
		weights: { ...defaultEditorialPolicy.weights, ...overrides.weights },
	};
}

function describeError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
}

/** The piece's screenshot ready for the engines, or undefined (invalid URLs are ignored). */
function pieceImage(piece: ContentPiece): DecisionImage | undefined {
	return piece.imageDataUrl ? (parseImageDataUrl(piece.imageDataUrl) ?? undefined) : undefined;
}

function buildRequest(piece: ContentPiece): DecisionRequest {
	const request: DecisionRequest = {
		input: buildContentInput(piece),
		questions: editorialQuestions,
	};
	const image = pieceImage(piece);
	return image ? { ...request, image } : request;
}

function suggestInput(piece: ContentPiece, failed: string[]): SuggestInput {
	const input: SuggestInput = { title: piece.title, body: piece.body, failedChecks: failed };
	const image = pieceImage(piece);
	return image ? { ...input, image } : input;
}

function withExpected(result: ReviewResult): ReviewResult {
	const expected = result.piece.expectedRoute;
	return expected ? { ...result, matchesExpected: expected === result.route } : result;
}

/**
 * Reviews one piece: the decision engine answers the editorial questions, the pure
 * policy routes it, and gray-zone pieces optionally get LLM suggestions.
 *
 * Never invents answers: if the engine fails, the piece goes to HUMAN_REVIEW with
 * `error` set.
 */
export async function reviewPiece(
	piece: ContentPiece,
	options: ReviewOptions,
	deps: ReviewDeps,
): Promise<ReviewResult> {
	let decision: DecisionResult;
	try {
		decision = await deps.decide(buildRequest(piece), piece.id);
	} catch (error) {
		// Log only the error, never the content under review.
		console.warn(`[review] decision failed for ${piece.id}: ${describeError(error)}`);
		return withExpected({
			piece,
			route: "HUMAN_REVIEW",
			editorialScore: 0,
			minConfidence: 0,
			reasons: [{ check: "decision_unavailable", value: 0, message: "Sin decisión del motor" }],
			answers: {},
			provider: null,
			model: null,
			usedFallback: false,
			latencyMs: 0,
			inputTokens: null,
			costUsd: null,
			error: DECISION_UNAVAILABLE_MESSAGE,
		});
	}

	const outcome = decideRoute(decision.answers, mergePolicy(options.policy));
	const result: ReviewResult = {
		piece,
		route: outcome.route,
		editorialScore: outcome.editorialScore,
		minConfidence: outcome.minConfidence,
		reasons: outcome.reasons,
		answers: decision.answers,
		provider: decision.provider,
		model: decision.model,
		usedFallback: decision.usedFallback,
		latencyMs: decision.latencyMs,
		inputTokens: decision.inputTokens,
		costUsd: decision.costUsd,
	};

	if (options.enrich && outcome.route === "ENRICH_WITH_LLM" && deps.suggest) {
		try {
			result.suggestions = await deps.suggest(suggestInput(piece, failedChecks(outcome.reasons)));
		} catch (error) {
			console.warn(`[review] suggestions failed for ${piece.id}: ${describeError(error)}`);
		}
	}

	return withExpected(result);
}

/**
 * On-demand LLM suggestions for one piece, whatever its route. Reuses the (cached)
 * decision to tell the LLM which checks failed.
 *
 * @throws SuggestionsNotConfiguredError when no LLM is configured.
 * @throws the decision or LLM error otherwise.
 */
export async function suggestFixesForPiece(
	piece: ContentPiece,
	options: Pick<ReviewOptions, "policy">,
	deps: ReviewDeps,
): Promise<EditorialSuggestions> {
	if (!deps.suggest) throw new SuggestionsNotConfiguredError();
	const decision = await deps.decide(buildRequest(piece), piece.id);
	const outcome = decideRoute(decision.answers, mergePolicy(options.policy));
	return deps.suggest(suggestInput(piece, failedChecks(outcome.reasons)));
}
