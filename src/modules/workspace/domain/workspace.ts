import type { ContentChannel, ContentFormat } from "../../content-review/domain/content-piece";
import type { Route } from "../../content-review/domain/editorial-policy";
import type { ReviewResult } from "../../content-review/domain/review";

/**
 * Light "CRM" for the creative team: every piece a person submits is stored with
 * its author, a workflow status, its JEV review and a history of what happened.
 */

/** Role of the person in the creative team. Free choice, no permissions attached. */
export type TeamRole = "design" | "copy" | "editor" | "other";

/** Every team role, for validation and selectors. */
export const TEAM_ROLES: readonly TeamRole[] = ["design", "copy", "editor", "other"];

/** Workflow column of a piece on the board. */
export type PieceStatus = "in_review" | "needs_changes" | "approved" | "rejected";

/** Every status, in board column order. */
export const PIECE_STATUSES: readonly PieceStatus[] = [
	"in_review",
	"needs_changes",
	"approved",
	"rejected",
];

/** Spanish column names of the board. */
export const PIECE_STATUS_LABEL: Record<PieceStatus, string> = {
	in_review: "Por revisar",
	needs_changes: "Por mejorar",
	approved: "Aprobado",
	rejected: "Rechazado",
};

/** URL that serves a stored piece's screenshot (GET /api/pieces/[id]/image). */
export function pieceImageUrl(pieceId: string): string {
	return `/api/pieces/${pieceId}/image`;
}

/** Status a fresh JEV route maps to. */
export const STATUS_FROM_ROUTE: Record<Route, PieceStatus> = {
	AUTO_APPROVE: "approved",
	ENRICH_WITH_LLM: "needs_changes",
	HUMAN_REVIEW: "in_review",
	REJECT: "rejected",
};

export interface WorkspacePiece {
	id: string;
	brandId: string;
	authorId: string;
	authorName: string;
	authorRole: TeamRole;
	title: string;
	body: string;
	format: ContentFormat;
	channel: ContentChannel;
	/** Relative URL served by GET /api/pieces/[id]/image when the piece has a screenshot. */
	imageUrl?: string;
	status: PieceStatus;
	/** Latest JEV review of the current version. */
	review: ReviewResult;
	/** 1 for the original; +1 each time a new version is saved (e.g. AI regeneration). */
	version: number;
	/** True for the demo pieces loaded from the simulated dataset (not uploaded by the person). */
	isExample: boolean;
	createdAt: string;
	updatedAt: string;
}

export type PieceEventType =
	| "submitted"
	| "reviewed"
	| "status_changed"
	| "ai_suggested"
	| "version_saved"
	| "note";

export interface PieceEvent {
	id: string;
	pieceId: string;
	type: PieceEventType;
	actorName: string;
	/** Short Spanish line for the timeline, e.g. "JEV: Mejorar con IA (Datos sin fuente)". */
	summary: string;
	createdAt: string;
}

/** Result of asking the AI to rewrite a piece fixing what JEV flagged. Not saved yet. */
export interface RegenerationProposal {
	title: string;
	body: string;
	/** What the AI changed, in short Spanish sentences. */
	changes: string[];
	/**
	 * Corrected screenshot (data URL, PNG) made with OpenAI gpt-image-2 when the
	 * original piece had one. Absent for text-only pieces or if image generation failed.
	 */
	imageDataUrl?: string;
	/** JEV's review of the rewritten version (same questions, same brand). */
	review: ReviewResult;
}
