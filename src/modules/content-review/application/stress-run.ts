// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile } from "../../brand/domain/brand-profile";
import { defaultBrand } from "../../brand/domain/default-brand";
import type { ContentPiece } from "../domain/content-piece";
import type { DecisionProvider, DecisionRequest, DecisionResult } from "../domain/decision";
import { decideRoute, type EditorialPolicy, type Route } from "../domain/editorial-policy";
import { buildContentInput, buildEditorialQuestions } from "../domain/editorial-questions";
import { mergePolicy, type PolicyOverrides } from "./review-piece";

/** Decisions in flight at the same time during a stress run. */
export const STRESS_CONCURRENCY = 32;

/** After this long, no new decisions are launched; in-flight ones still finish. */
export const STRESS_SOFT_DEADLINE_MS = 55_000;

const ROUTES: readonly Route[] = ["AUTO_APPROVE", "ENRICH_WITH_LLM", "HUMAN_REVIEW", "REJECT"];

/** Ports the stress run depends on. `decide` must hit the engine directly (no cache). */
export interface StressDeps {
	/** Seed pieces the synthetic ones are cycled from (the 45 sample pieces). */
	content: readonly ContentPiece[];
	/** The decision engine itself, never the cached adapter. */
	decide(request: DecisionRequest): Promise<DecisionResult>;
	/** Monotonic clock in ms. Defaults to `performance.now()`. */
	now?(): number;
}

export interface StressInput {
	count: number;
	brand?: BrandProfile;
	policy?: PolicyOverrides;
	/** Prefix for the synthetic ids. Defaults to a timestamp. */
	runId?: string;
	/** Defaults to STRESS_CONCURRENCY. */
	concurrency?: number;
	/** Defaults to STRESS_SOFT_DEADLINE_MS. */
	softDeadlineMs?: number;
}

export interface StressReport {
	/** Decisions asked for. */
	requested: number;
	/** Decisions actually attempted (less than `requested` if the deadline hit). */
	count: number;
	/** True when the soft deadline stopped the run before `requested`. */
	partial: boolean;
	concurrency: number;
	totalMs: number;
	decisionsPerSecond: number;
	/** Engine latency percentiles over successful decisions. */
	p50Ms: number;
	p95Ms: number;
	totalCostUsd: number;
	/** Cost per 1.000 successful decisions. */
	costPer1kUsd: number;
	byRoute: Record<Route, number>;
	/** Who answered: JEV, or OpenAI (directly or as fallback). */
	providers: Record<DecisionProvider, number>;
	/** Decisions answered by the fallback provider after JEV failed. */
	fallbackCount: number;
	/** Decisions no provider could answer (they would go to human review). */
	failures: number;
}

/** Nearest-rank percentile (p in 0–1) of an ascending list; 0 when empty. */
export function percentile(sorted: readonly number[], p: number): number {
	if (sorted.length === 0) return 0;
	const rank = Math.ceil(p * sorted.length);
	return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

/**
 * `count` text-only pieces cycled from `seed`, each with a unique id and a numbered
 * sign-off line so no cache (ours or the provider's) can answer them for free.
 */
export function buildStressPieces(
	seed: readonly ContentPiece[],
	count: number,
	runId: string,
): ContentPiece[] {
	if (seed.length === 0) return [];
	return Array.from({ length: count }, (_, n) => {
		const base = seed[n % seed.length];
		return {
			id: `stress-${runId}-${n + 1}`,
			title: base.title,
			body: `${base.body}\n\nEquipo Media 30X · pieza ${n + 1} de ${count}.`,
			format: base.format,
			channel: base.channel,
			author: base.author,
			createdAt: base.createdAt,
		};
	});
}

interface Outcome {
	route: Route;
	decision: DecisionResult | null;
}

/** Maps `items` with at most `limit` in flight, launching nothing once `stop()` is true. */
async function poolUntil<T, R>(
	items: readonly T[],
	limit: number,
	stop: () => boolean,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = [];
	let next = 0;
	const worker = async () => {
		while (next < items.length && !stop()) {
			const item = items[next++];
			results.push(await fn(item));
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
	return results;
}

function summarize(
	outcomes: readonly Outcome[],
	requested: number,
	concurrency: number,
	totalMs: number,
): StressReport {
	const byRoute = Object.fromEntries(ROUTES.map((route) => [route, 0])) as Record<Route, number>;
	const providers: Record<DecisionProvider, number> = { jev: 0, openai: 0 };
	const latencies: number[] = [];
	let totalCostUsd = 0;
	let fallbackCount = 0;
	let failures = 0;

	for (const { route, decision } of outcomes) {
		byRoute[route] += 1;
		if (!decision) {
			failures += 1;
			continue;
		}
		providers[decision.provider] += 1;
		if (decision.usedFallback) fallbackCount += 1;
		latencies.push(decision.latencyMs);
		totalCostUsd += decision.costUsd ?? 0;
	}
	latencies.sort((a, b) => a - b);
	const succeeded = latencies.length;

	return {
		requested,
		count: outcomes.length,
		partial: outcomes.length < requested,
		concurrency,
		totalMs,
		decisionsPerSecond: totalMs > 0 ? outcomes.length / (totalMs / 1000) : 0,
		p50Ms: percentile(latencies, 0.5),
		p95Ms: percentile(latencies, 0.95),
		totalCostUsd,
		costPer1kUsd: succeeded > 0 ? (totalCostUsd / succeeded) * 1000 : 0,
		byRoute,
		providers,
		fallbackCount,
		failures,
	};
}

function describeError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
}

/**
 * "Prueba de escala": runs `count` real, uncached, text-only decisions through the engine
 * with a concurrency pool and measures throughput, latency and cost. Routes come from the
 * same pure policy as a normal review; no LLM enrichment. Stops launching new work at the
 * soft deadline and reports the partial count honestly.
 */
export async function runStress(input: StressInput, deps: StressDeps): Promise<StressReport> {
	const now = deps.now ?? (() => performance.now());
	const brand = input.brand ?? defaultBrand;
	const policy: EditorialPolicy = mergePolicy(input.policy);
	const concurrency = Math.max(1, input.concurrency ?? STRESS_CONCURRENCY);
	const deadline = input.softDeadlineMs ?? STRESS_SOFT_DEADLINE_MS;
	const runId = input.runId ?? Date.now().toString(36);
	const pieces = buildStressPieces(deps.content, Math.max(0, input.count), runId);
	const questions = buildEditorialQuestions(brand);

	let firstError: unknown;
	const startedAt = now();
	const outcomes = await poolUntil(
		pieces,
		concurrency,
		() => now() - startedAt >= deadline,
		async (piece): Promise<Outcome> => {
			try {
				const decision = await deps.decide({ input: buildContentInput(piece, brand), questions });
				return { route: decideRoute(decision.answers, policy).route, decision };
			} catch (error) {
				firstError ??= error;
				return { route: "HUMAN_REVIEW", decision: null };
			}
		},
	);
	const totalMs = now() - startedAt;

	const report = summarize(outcomes, pieces.length, concurrency, totalMs);
	if (report.failures > 0) {
		// One line per run, never the content under review.
		console.warn(
			`[stress] ${report.failures}/${report.count} decisions failed; first: ${describeError(firstError)}`,
		);
	}
	return report;
}
