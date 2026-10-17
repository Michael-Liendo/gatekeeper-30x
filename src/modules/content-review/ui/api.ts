import type { ContentChannel, ContentFormat, ContentPiece } from "../domain/content-piece";
import type { EditorialPolicy } from "../domain/editorial-policy";
import type {
	EditorialSuggestions,
	ReviewBatchRequest,
	ReviewBatchResponse,
	ReviewResult,
} from "../domain/review";

/** Typed client for the content-review API routes. Errors carry a Spanish message. */

export class ApiError extends Error {
	readonly status: number | null;

	constructor(message: string, status: number | null) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export interface ReviewPieceRequest {
	/** Defaults server-side to "Captura sin título". */
	title?: string;
	/** At least one of `body` or `imageDataUrl` is required. */
	body?: string;
	/** "data:image/png;base64,..." or "data:image/jpeg;base64,...", max 4 MB decoded. */
	imageDataUrl?: string;
	format: ContentFormat;
	channel: ContentChannel;
	policy?: Partial<EditorialPolicy>;
	enrich?: boolean;
}

function hasErrorMessage(value: unknown): value is { error: string } {
	return (
		typeof value === "object" &&
		value !== null &&
		"error" in value &&
		typeof value.error === "string"
	);
}

async function request<T>(url: string, body?: unknown): Promise<T> {
	let response: Response;
	try {
		response = await fetch(url, {
			method: body === undefined ? "GET" : "POST",
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
			cache: "no-store",
		});
	} catch {
		throw new ApiError(
			"No se pudo conectar con el servidor. Revisa la conexión y reintenta.",
			null,
		);
	}

	const data: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		const message = hasErrorMessage(data)
			? data.error
			: `El servidor respondió con un error (${response.status}).`;
		throw new ApiError(message, response.status);
	}
	if (data === null) {
		throw new ApiError("El servidor devolvió una respuesta vacía.", response.status);
	}
	return data as T;
}

export function errorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	return "Ocurrió un error inesperado. Reintenta en unos segundos.";
}

export function fetchContent(): Promise<ContentPiece[]> {
	return request<ContentPiece[]>("/api/content");
}

export function reviewBatch(payload: ReviewBatchRequest): Promise<ReviewBatchResponse> {
	return request<ReviewBatchResponse>("/api/review", payload);
}

export function reviewPiece(payload: ReviewPieceRequest): Promise<ReviewResult> {
	return request<ReviewResult>("/api/review/piece", payload);
}

export function enrichPiece(id: string): Promise<EditorialSuggestions> {
	return request<EditorialSuggestions>("/api/enrich", { id });
}
