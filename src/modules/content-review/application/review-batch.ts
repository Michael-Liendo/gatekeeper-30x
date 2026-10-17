import type { BrandProfile } from "../../brand/domain/brand-profile";
import { toImageDataUrl } from "../domain/content-image";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionImage } from "../domain/decision";
import { computeMetrics } from "../domain/metrics";
import type { ReviewBatchRequest, ReviewBatchResponse } from "../domain/review";
import { type PolicyOverrides, type ReviewDeps, reviewPiece } from "./review-piece";

/**
 * `ReviewBatchRequest` whose policy may also override weights one by one, plus the brand
 * the pieces are judged against (defaults to 30X, the simulated dataset's brand).
 */
export type ReviewBatchInput = Omit<ReviewBatchRequest, "policy"> & {
	policy?: PolicyOverrides;
	brand?: BrandProfile;
};

/** Max pieces reviewed at the same time, to stay under provider rate limits. */
const CONCURRENCY = 8;

export interface ReviewBatchDeps extends ReviewDeps {
	/** The dataset the batch runs over. */
	content: readonly ContentPiece[];
	/**
	 * Loads a bundled sample image by its public path (`piece.imagePath`). Returns null
	 * when the file is missing or invalid; the piece is then reviewed text-only.
	 */
	loadImage?(imagePath: string): Promise<DecisionImage | null>;
}

/**
 * The piece as the decision engine should see it: dataset pieces with an `imagePath`
 * (and no screenshot of their own) get the sample image attached as `imageDataUrl`.
 */
export async function withSampleImage(
	piece: ContentPiece,
	loadImage: ReviewBatchDeps["loadImage"],
): Promise<ContentPiece> {
	if (!piece.imagePath || piece.imageDataUrl || !loadImage) return piece;
	const image = await loadImage(piece.imagePath).catch(() => null);
	return image ? { ...piece, imageDataUrl: toImageDataUrl(image) } : piece;
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
	const options = { policy: request.policy, enrich: request.enrich ?? false, brand: request.brand };

	const results = await mapWithConcurrency(pieces, CONCURRENCY, async (piece) => {
		const result = await reviewPiece(await withSampleImage(piece, deps.loadImage), options, deps);
		// Return the original piece: the client shows `imagePath`, so the base64 copy
		// would only bloat the response.
		return { ...result, piece };
	});
	return { results, metrics: computeMetrics(results) };
}
