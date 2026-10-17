import type { ContentPiece } from "../domain/content-piece";
import { computeMetrics } from "../domain/metrics";
import type { ReviewBatchRequest, ReviewBatchResponse } from "../domain/review";
import { type PolicyOverrides, type ReviewDeps, reviewPiece } from "./review-piece";

/** `ReviewBatchRequest` whose policy may also override weights one by one. */
export type ReviewBatchInput = Omit<ReviewBatchRequest, "policy"> & { policy?: PolicyOverrides };

/** Max pieces reviewed at the same time, to stay under provider rate limits. */
const CONCURRENCY = 8;

export interface ReviewBatchDeps extends ReviewDeps {
	/** The dataset the batch runs over. */
	content: readonly ContentPiece[];
}

/** Maps `items` with at most `limit` calls in flight; results keep the input order. */
async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/** Reviews the dataset (or the requested ids) and aggregates the KPIs. */
export async function reviewBatch(
	request: ReviewBatchInput,
	deps: ReviewBatchDeps,
): Promise<ReviewBatchResponse> {
	const ids = request.ids ? new Set(request.ids) : null;
	const pieces = ids ? deps.content.filter((piece) => ids.has(piece.id)) : deps.content;
	const options = { policy: request.policy, enrich: request.enrich ?? false };

	const results = await mapWithConcurrency(pieces, CONCURRENCY, (piece) =>
		reviewPiece(piece, options, deps),
	);
	return { results, metrics: computeMetrics(results) };
}
