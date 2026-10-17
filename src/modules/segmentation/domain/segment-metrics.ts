import type { DecisionProvider } from "../../content-review/domain/decision";
import { isHighAffinity, PROGRAM_KEYS, type ProfileLabels, type ProgramKey } from "./profile";
import type { NextAction, SegmentDecision } from "./segment-policy";

/** One segmented dataset row, as the metrics need it. */
export interface MeasuredRow {
	decision: SegmentDecision;
	labels: ProfileLabels;
	latencyMs: number | null;
	costUsd: number | null;
	provider: DecisionProvider | null;
	usedFallback: boolean;
	failed: boolean;
}

export interface ProgramAccuracy {
	program: ProgramKey;
	total: number;
	correct: number;
	accuracy: number;
}

export interface SegmentMetrics {
	total: number;
	/** Assigned program (or "none") equals 30X's "Programa sugerido", over every row. */
	accuracy: number;
	/** Same, only over rows where 30X did suggest a program. */
	accuracyWithProgram: number;
	/** The engine's raw top choice equals the label (before the confidence gate). */
	engineChoiceAccuracy: number;
	byProgram: ProgramAccuracy[];
	/** sales_ready (≥ threshold) agrees with affinity band alta / muy alta. */
	affinityAgreement: number;
	/** Of the people flagged ready, share 30X rates alta / muy alta. */
	readyPrecision: number;
	/** Share of rows routed to an advisor. */
	advisorRate: number;
	actions: Record<NextAction, number>;
	failed: number;
	fallbackCount: number;
	providers: Partial<Record<DecisionProvider, number>>;
	avgLatencyMs: number;
	totalCostUsd: number;
	/** Wall-clock time of the whole batch. */
	wallMs: number;
}

function ratio(part: number, whole: number): number {
	return whole === 0 ? 0 : part / whole;
}

/** Pure aggregation: code computes, the engine only judged each row. */
export function computeSegmentMetrics(
	rows: readonly MeasuredRow[],
	salesReadyThreshold: number,
	wallMs: number,
): SegmentMetrics {
	const withProgram = rows.filter((row) => row.labels.programaSugerido !== "none");
	const hits = (row: MeasuredRow) => row.decision.program === row.labels.programaSugerido;

	const byProgram = PROGRAM_KEYS.map((program) => {
		const group = rows.filter((row) => row.labels.programaSugerido === program);
		const correct = group.filter(hits).length;
		return { program, total: group.length, correct, accuracy: ratio(correct, group.length) };
	}).filter((entry) => entry.total > 0);

	const ready = rows.filter((row) => row.decision.salesReady >= salesReadyThreshold);
	const agree = rows.filter(
		(row) =>
			row.decision.salesReady >= salesReadyThreshold === isHighAffinity(row.labels.bandaAfinidad),
	);

	const actions: Record<NextAction, number> = {
		ADVISOR: 0,
		PROPOSAL: 0,
		NURTURE: 0,
		HUMAN_REVIEW: 0,
	};
	const providers: Partial<Record<DecisionProvider, number>> = {};
	let latencySum = 0;
	let latencyCount = 0;
	let totalCostUsd = 0;
	for (const row of rows) {
		actions[row.decision.action] += 1;
		if (row.provider) providers[row.provider] = (providers[row.provider] ?? 0) + 1;
		if (row.latencyMs !== null) {
			latencySum += row.latencyMs;
			latencyCount += 1;
		}
		totalCostUsd += row.costUsd ?? 0;
	}

	return {
		total: rows.length,
		accuracy: ratio(rows.filter(hits).length, rows.length),
		accuracyWithProgram: ratio(withProgram.filter(hits).length, withProgram.length),
		engineChoiceAccuracy: ratio(
			rows.filter((row) => row.decision.engineChoice === row.labels.programaSugerido).length,
			rows.length,
		),
		byProgram,
		affinityAgreement: ratio(agree.length, rows.length),
		readyPrecision: ratio(
			ready.filter((row) => isHighAffinity(row.labels.bandaAfinidad)).length,
			ready.length,
		),
		advisorRate: ratio(actions.ADVISOR, rows.length),
		actions,
		failed: rows.filter((row) => row.failed).length,
		fallbackCount: rows.filter((row) => row.usedFallback).length,
		providers,
		avgLatencyMs: ratio(latencySum, latencyCount),
		totalCostUsd,
		wallMs,
	};
}
