import type { ContentChannel, ContentFormat } from "@/modules/content-review/domain/content-piece";
import { ApiError, fetchJson } from "@/shared/ui/fetch-json";
import type {
	PieceEvent,
	PieceStatus,
	RegenerationProposal,
	WorkspacePiece,
} from "../domain/workspace";

/** Client calls for the team workspace API (docs/09-contrato-crm.md). */

export interface NewPieceInput {
	title?: string;
	body?: string;
	format: ContentFormat;
	channel: ContentChannel;
	imageDataUrl?: string;
}

export interface PieceDetailResponse {
	piece: WorkspacePiece;
	events: PieceEvent[];
}

export interface NewVersionInput {
	title: string;
	body: string;
	changes?: string[];
	imageDataUrl?: string;
}

function pieceUrl(id: string): string {
	return `/api/pieces/${encodeURIComponent(id)}`;
}

export function listPieces(signal?: AbortSignal): Promise<WorkspacePiece[]> {
	return fetchJson<WorkspacePiece[]>("/api/pieces", { signal });
}

export function createPiece(input: NewPieceInput): Promise<WorkspacePiece> {
	return fetchJson<WorkspacePiece>("/api/pieces", { body: input });
}

export function getPiece(id: string, signal?: AbortSignal): Promise<PieceDetailResponse> {
	return fetchJson<PieceDetailResponse>(pieceUrl(id), { signal });
}

export function movePiece(id: string, status: PieceStatus, note?: string): Promise<WorkspacePiece> {
	return fetchJson<WorkspacePiece>(pieceUrl(id), { method: "PATCH", body: { status, note } });
}

export function saveVersion(id: string, input: NewVersionInput): Promise<WorkspacePiece> {
	return fetchJson<WorkspacePiece>(`${pieceUrl(id)}/versions`, { body: input });
}

export function regeneratePiece(
	pieceId: string,
	signal?: AbortSignal,
): Promise<RegenerationProposal> {
	return fetchJson<RegenerationProposal>("/api/regenerate", { body: { pieceId }, signal });
}

/** Loads the demo example pieces (idempotent). */
export function loadExamples(): Promise<{ created: number }> {
	return fetchJson<{ created: number }>("/api/pieces/examples", { method: "POST" });
}

/** Removes the demo example pieces. */
export function removeExamples(): Promise<{ removed: number }> {
	return fetchJson<{ removed: number }>("/api/pieces/examples", { method: "DELETE" });
}

function serverMessage(body: unknown): string | null {
	if (typeof body === "object" && body !== null && "error" in body) {
		const { error } = body as { error: unknown };
		if (typeof error === "string" && error.length > 0) return error;
	}
	return null;
}

/** Plain Spanish message for a failed regeneration (503: AI off, 502: AI failed). */
export function regenerationErrorMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === "AbortError") {
		return "La IA tardó demasiado en responder. Intenta de nuevo en un momento.";
	}
	if (error instanceof ApiError) {
		const fromServer = serverMessage(error.body);
		if (fromServer) return fromServer;
		if (error.status === 503) {
			return "La regeneración con IA no está disponible en este momento. Intenta más tarde.";
		}
		if (error.status === 502) {
			return "La IA no pudo reescribir la pieza esta vez. Intenta de nuevo.";
		}
		return error.message;
	}
	return "Algo salió mal. Intenta de nuevo en un momento.";
}

export function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : "Algo salió mal. Intenta de nuevo en un momento.";
}
