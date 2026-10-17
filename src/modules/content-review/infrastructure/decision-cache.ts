import "server-only";
import { createHash } from "node:crypto";
import type { DecisionRequest, DecisionResult } from "../domain/decision";

const MAX_ENTRIES = 500;

/**
 * In-memory, per-process cache of decisions. Re-running the demo or re-tuning
 * thresholds reuses the answers instead of paying for the same call again. Cached
 * results keep the original latency and cost, so the KPIs stay honest.
 *
 * Stores the in-flight promise, so concurrent requests for the same piece share one
 * call. Failed calls are not cached.
 */
const cache = new Map<string, Promise<DecisionResult>>();

function cacheKey(request: DecisionRequest, pieceId: string | undefined): string {
	const hash = createHash("sha256")
		.update(JSON.stringify({ input: request.input, questions: request.questions }))
		.digest("hex");
	return `${pieceId ?? "anonymous"}:${hash}`;
}

export function cachedDecide(
	request: DecisionRequest,
	pieceId: string | undefined,
	decide: (request: DecisionRequest) => Promise<DecisionResult>,
): Promise<DecisionResult> {
	const key = cacheKey(request, pieceId);
	const hit = cache.get(key);
	if (hit) return hit;

	const pending = decide(request);
	cache.set(key, pending);
	pending.catch(() => {
		if (cache.get(key) === pending) cache.delete(key);
	});

	// Map keeps insertion order: drop the oldest entries past the cap.
	while (cache.size > MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
	return pending;
}
