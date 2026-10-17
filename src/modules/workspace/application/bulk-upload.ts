// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile } from "../../brand/domain/brand-profile";
import { titleFromBody } from "../domain/content-grid";
import { GRID_SUBMITTED_SUMMARY, gridNoteSummary } from "../domain/piece-timeline";
import { PIECE_STATUSES, type PieceStatus, type WorkspacePiece } from "../domain/workspace";
import { type Actor, createReviewedPiece } from "./piece-workflow";
import { runPool } from "./run-pool";
import type { WorkspaceDeps } from "./workspace-ports";
import type { BulkUploadInput } from "./workspace-schemas";

/** Reviews running at the same time for one grid. */
export const BULK_CONCURRENCY = 8;

/** Spanish message for a row that could not be stored or reviewed. */
export const BULK_ROW_FAILED_MESSAGE = "No pudimos revisar esta pieza. Intenta cargarla de nuevo.";

export interface BulkUploadResult {
	/** Stored pieces, in grid order. */
	created: WorkspacePiece[];
	/** Rows that failed, by their index in the request. */
	failed: { index: number; error: string }[];
	byStatus: Record<PieceStatus, number>;
	totalMs: number;
}

/** Optional hook for logging failures without coupling the use case to a logger. */
export interface BulkUploadOptions {
	concurrency?: number;
	onError?: (index: number, error: unknown) => void;
}

/**
 * Stores and reviews every piece of a content grid with the actor's brand, at most
 * BULK_CONCURRENCY at a time. One failing row never stops the rest.
 */
export async function bulkUploadPieces(
	input: BulkUploadInput,
	actor: Actor,
	brand: BrandProfile,
	deps: WorkspaceDeps,
	options: BulkUploadOptions = {},
): Promise<BulkUploadResult> {
	const started = Date.now();
	const results: (WorkspacePiece | undefined)[] = new Array(input.pieces.length);
	const failed: BulkUploadResult["failed"] = [];

	await runPool(input.pieces, options.concurrency ?? BULK_CONCURRENCY, async (row, index) => {
		try {
			results[index] = await createReviewedPiece(
				{
					title: row.title || titleFromBody(row.body),
					body: row.body,
					format: row.format,
					channel: row.channel,
					image: null,
					ownerId: actor.id,
					authorName: actor.name,
					authorRole: actor.role,
					submittedSummary: GRID_SUBMITTED_SUMMARY,
					...(row.scheduledFor ? { scheduledFor: row.scheduledFor } : {}),
					...(input.campaign ? { campaign: input.campaign } : {}),
					...(row.notes ? { noteSummary: gridNoteSummary(row.notes) } : {}),
				},
				brand,
				deps,
			);
		} catch (error) {
			options.onError?.(index, error);
			failed.push({ index, error: BULK_ROW_FAILED_MESSAGE });
		}
	});

	const created = results.filter((piece): piece is WorkspacePiece => piece !== undefined);
	const byStatus = Object.fromEntries(PIECE_STATUSES.map((status) => [status, 0])) as Record<
		PieceStatus,
		number
	>;
	for (const piece of created) byStatus[piece.status] += 1;
	failed.sort((a, b) => a.index - b.index);

	return { created, failed, byStatus, totalMs: Date.now() - started };
}
