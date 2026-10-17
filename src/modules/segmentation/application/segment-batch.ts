import type { DatasetProfile, LeadProfile, ProgramKey } from "../domain/profile";
import { DEFAULT_SAMPLE_SEED, stratifiedSample } from "../domain/sample";
import { computeSegmentMetrics, type SegmentMetrics } from "../domain/segment-metrics";
import { defaultSegmentPolicy } from "../domain/segment-policy";
import { type SegmentDeps, type SegmentResult, segmentProfile } from "./segment-profile";

/** Max sign-ups segmented at the same time. */
const CONCURRENCY = 16;

export interface SegmentBatchDeps extends SegmentDeps {
	profiles: readonly DatasetProfile[];
}

export type SegmentBatchRequest = { ids: readonly string[] } | { size: number; seed?: number };

export interface SegmentedRow {
	id: string;
	profile: LeadProfile;
	/** Only the labels the UI compares against; CRM outcomes stay on the server. */
	expected: { program: ProgramKey; affinityBand: string };
	result: SegmentResult;
	/** Assigned program equals 30X's suggested program. */
	matches: boolean;
}

export interface SegmentBatchResponse {
	rows: SegmentedRow[];
	metrics: SegmentMetrics;
}

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

/** The rows a request points at: explicit ids, or a reproducible stratified sample. */
export function pickProfiles(
	profiles: readonly DatasetProfile[],
	request: SegmentBatchRequest,
): DatasetProfile[] {
	if ("ids" in request) {
		const wanted = new Set(request.ids);
		return profiles.filter((row) => wanted.has(row.id));
	}
	return stratifiedSample(
		profiles,
		request.size,
		(row) => row.labels.programaSugerido,
		request.seed ?? DEFAULT_SAMPLE_SEED,
	);
}

/** Segments a set of 30X profiles and measures them against 30X's own labels. */
export async function segmentBatch(
	request: SegmentBatchRequest,
	deps: SegmentBatchDeps,
): Promise<SegmentBatchResponse> {
	const policy = deps.policy ?? defaultSegmentPolicy;
	const picked = pickProfiles(deps.profiles, request);
	const started = performance.now();
	const rows = await mapWithConcurrency(picked, CONCURRENCY, async (row) => {
		const result = await segmentProfile(row.profile, deps);
		return {
			id: row.id,
			profile: row.profile,
			expected: {
				program: row.labels.programaSugerido,
				affinityBand: row.labels.bandaAfinidad,
			},
			result,
			matches: result.decision.program === row.labels.programaSugerido,
		};
	});
	const wallMs = Math.round(performance.now() - started);

	const metrics = computeSegmentMetrics(
		rows.map((row, index) => ({
			decision: row.result.decision,
			labels: picked[index].labels,
			latencyMs: row.result.latencyMs,
			costUsd: row.result.costUsd,
			provider: row.result.provider,
			usedFallback: row.result.usedFallback,
			failed: row.result.failed,
		})),
		policy.salesReady,
		wallMs,
	);
	return { rows, metrics };
}
