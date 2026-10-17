import type { Route } from "./editorial-policy";
import type { ReviewMetrics, ReviewResult } from "./review";

const ROUTES: readonly Route[] = ["AUTO_APPROVE", "ENRICH_WITH_LLM", "HUMAN_REVIEW", "REJECT"];

/** Aggregates KPIs for a batch of reviews. Pure, so the panel can recompute it live. */
export function computeMetrics(results: readonly ReviewResult[]): ReviewMetrics {
	const byRoute = Object.fromEntries(ROUTES.map((route) => [route, 0])) as Record<Route, number>;
	let latency = 0;
	let cost = 0;
	let fallbackCount = 0;
	let labeled = 0;
	let correct = 0;

	for (const result of results) {
		byRoute[result.route] += 1;
		latency += result.latencyMs;
		cost += result.costUsd ?? 0;
		if (result.usedFallback) fallbackCount += 1;
		if (result.piece.expectedRoute) {
			labeled += 1;
			if (result.piece.expectedRoute === result.route) correct += 1;
		}
	}

	const total = results.length;
	const share = (n: number) => (total === 0 ? 0 : n / total);

	return {
		total,
		byRoute,
		automationRate: share(byRoute.AUTO_APPROVE + byRoute.REJECT),
		escalationRate: share(byRoute.HUMAN_REVIEW),
		accuracy: labeled === 0 ? null : correct / labeled,
		avgLatencyMs: total === 0 ? 0 : latency / total,
		totalCostUsd: cost,
		costPer1kUsd: total === 0 ? 0 : (cost / total) * 1000,
		fallbackCount,
	};
}
