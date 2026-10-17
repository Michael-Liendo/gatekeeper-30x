// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile } from "../../brand/domain/brand-profile";
import type { ContentChannel, ContentFormat, ContentPiece } from "../domain/content-piece";
import type { DecisionAnswer } from "../domain/decision";
import { failedChecks } from "../domain/editorial-policy";
import type { ReviewResult } from "../domain/review";
import { type PolicyOverrides, type ReviewDeps, reviewPiece } from "./review-piece";

/** What the rewriter LLM receives: the piece, the brand and what JEV flagged. */
export interface RewriteInput {
	title: string;
	body: string;
	format: ContentFormat;
	channel: ContentChannel;
	/** The brand whose voice, offer and forbidden topics the rewrite must respect. */
	brand: BrandProfile;
	/** Human-readable descriptions of the checks the piece failed. */
	failedChecks: string[];
	/** One line per JEV answer, e.g. "unsourced_claims: sí (82%)". */
	answersSummary: string[];
	/** Screenshot of the piece, when it was submitted as an image. */
	imageDataUrl?: string;
}

export interface RewriteOutput {
	title: string;
	body: string;
	/** 2–5 short Spanish sentences describing what changed. */
	changes: string[];
}

/** What the image model receives to redraw a screenshot with the corrected copy. */
export interface ImageRegenerationInput {
	/** Original screenshot (PNG/JPEG data URL). */
	imageDataUrl: string;
	/** Rewritten copy that must replace the text on the image. */
	title: string;
	body: string;
	/** What the rewrite fixed (to remove the same problems from the visual). */
	changes: string[];
	failedChecks: string[];
	brand: BrandProfile;
}

/** Ports for "Regenerar con IA": the review ports plus the rewriter and image model. */
export interface RegenerateDeps extends ReviewDeps {
	/** Absent when no LLM is configured. */
	rewrite?(input: RewriteInput): Promise<RewriteOutput>;
	/** Absent when no image model is configured; the screenshot is then kept as is. */
	regenerateImage?(input: ImageRegenerationInput): Promise<string>;
}

export interface RegenerateInput {
	piece: ContentPiece;
	/** Brand the piece is rewritten for and judged against (the same for both reviews). */
	brand: BrandProfile;
	/** Latest review of the original. When absent, the original is reviewed first. */
	previousReview?: ReviewResult;
	policy?: PolicyOverrides;
}

/** Proposal returned to the UI. Mirrors the workspace `RegenerationProposal`. */
export interface RegenerationResult {
	title: string;
	body: string;
	changes: string[];
	review: ReviewResult;
	imageDataUrl?: string;
}

/** Spanish note added to `changes` when the screenshot could not be regenerated. */
export const IMAGE_NOT_REGENERATED_NOTE = "No pudimos regenerar la imagen; se mantuvo la original.";

/** Thrown when no LLM is configured for regeneration. */
export class RegenerationNotConfiguredError extends Error {
	constructor() {
		super("No LLM configured for piece regeneration");
		this.name = "RegenerationNotConfiguredError";
	}
}

/** Thrown when the rewriter failed or returned an unusable piece. */
export class RegenerationFailedError extends Error {
	constructor(cause?: unknown) {
		super(
			cause instanceof Error ? `Rewrite failed: ${cause.message}` : "Rewrite failed",
			cause === undefined ? undefined : { cause },
		);
		this.name = "RegenerationFailedError";
	}
}

function percent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

/** One readable line per JEV answer, for the rewriter's context. */
export function summarizeAnswers(answers: Record<string, DecisionAnswer>): string[] {
	return Object.entries(answers).map(([key, answer]) => {
		switch (answer.type) {
			case "yes_no":
				return `${key}: ${answer.probability >= 0.5 ? "sí" : "no"} (${percent(answer.probability)} sí)`;
			case "choice":
				return `${key}: ${answer.choice} (confianza ${percent(answer.confidence)})`;
			default:
				return `${key}: nivel ${answer.score.toFixed(1)} (confianza ${percent(answer.confidence)})`;
		}
	});
}

function describeError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
}

function cleanChanges(changes: readonly string[]): string[] {
	return changes.map((change) => change.trim()).filter(Boolean);
}

/**
 * "Regenerar con IA": an LLM rewrites the piece in the brand's voice fixing only what
 * JEV flagged; for screenshots an image model redraws the visual with the new copy;
 * then JEV reviews the new version with the same brand and questions. Nothing is saved.
 *
 * @throws RegenerationNotConfiguredError when no LLM is configured.
 * @throws RegenerationFailedError when the rewrite fails or comes back empty.
 */
export async function regeneratePiece(
	input: RegenerateInput,
	deps: RegenerateDeps,
): Promise<RegenerationResult> {
	if (!deps.rewrite) throw new RegenerationNotConfiguredError();
	const { piece, brand, policy } = input;

	const previous =
		input.previousReview ?? (await reviewPiece(piece, { brand, policy, enrich: false }, deps));
	const failed = failedChecks(previous.reasons);

	const rewriteInput: RewriteInput = {
		title: piece.title,
		body: piece.body,
		format: piece.format,
		channel: piece.channel,
		brand,
		failedChecks: failed,
		answersSummary: summarizeAnswers(previous.answers),
	};
	if (piece.imageDataUrl) rewriteInput.imageDataUrl = piece.imageDataUrl;

	let rewritten: RewriteOutput;
	try {
		rewritten = await deps.rewrite(rewriteInput);
	} catch (error) {
		// Log only the error, never the content.
		console.warn(`[regenerate] rewrite failed for ${piece.id}: ${describeError(error)}`);
		throw new RegenerationFailedError(error);
	}
	const title = rewritten.title.trim() || piece.title;
	const body = rewritten.body.trim();
	if (!body) throw new RegenerationFailedError(new Error("empty body"));
	const changes = cleanChanges(rewritten.changes);

	let imageDataUrl: string | undefined;
	if (piece.imageDataUrl) {
		if (deps.regenerateImage) {
			try {
				imageDataUrl = await deps.regenerateImage({
					imageDataUrl: piece.imageDataUrl,
					title,
					body,
					changes,
					failedChecks: failed,
					brand,
				});
			} catch (error) {
				console.warn(`[regenerate] image failed for ${piece.id}: ${describeError(error)}`);
			}
		}
		if (!imageDataUrl) changes.push(IMAGE_NOT_REGENERATED_NOTE);
	}

	// The new version: rewritten copy plus the new visual. When the screenshot could not
	// be redrawn the original is kept, so JEV judges it too (honest verdict).
	const { expectedRoute: _expected, imageDataUrl: _oldImage, ...rest } = piece;
	const candidate: ContentPiece = { ...rest, title, body };
	const candidateImage = imageDataUrl ?? piece.imageDataUrl;
	if (candidateImage) candidate.imageDataUrl = candidateImage;

	const review = await reviewPiece(candidate, { brand, policy, enrich: false }, deps);
	const result: RegenerationResult = { title, body, changes, review };
	if (imageDataUrl) result.imageDataUrl = imageDataUrl;
	return result;
}
