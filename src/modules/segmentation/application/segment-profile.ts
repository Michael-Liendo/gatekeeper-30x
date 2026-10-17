import type {
	DecisionProvider,
	DecisionRequest,
	DecisionResult,
} from "../../content-review/domain/decision";
import { type LeadProfile, toDecisionInput } from "../domain/profile";
import {
	decideSegment,
	defaultSegmentPolicy,
	type SegmentDecision,
	type SegmentPolicy,
} from "../domain/segment-policy";
import { segmentQuestions } from "../domain/segment-questions";

export interface SegmentDeps {
	/** The decision engine (JEV, with OpenAI fallback), possibly cached. */
	decide(request: DecisionRequest): Promise<DecisionResult>;
	policy?: SegmentPolicy;
}

export interface SegmentResult {
	decision: SegmentDecision;
	provider: DecisionProvider | null;
	model: string | null;
	latencyMs: number | null;
	costUsd: number | null;
	usedFallback: boolean;
	/** True when no provider answered; the person goes to human review. */
	failed: boolean;
}

/** The request the engine gets: sign-up fields only, never 30X's labels. */
export function buildSegmentRequest(profile: LeadProfile): DecisionRequest {
	return { input: toDecisionInput(profile), questions: segmentQuestions };
}

/** Places one person in a segment and picks the next action. Never throws. */
export async function segmentProfile(
	profile: LeadProfile,
	deps: SegmentDeps,
): Promise<SegmentResult> {
	const policy = deps.policy ?? defaultSegmentPolicy;
	try {
		const result = await deps.decide(buildSegmentRequest(profile));
		return {
			decision: decideSegment(result.answers, policy),
			provider: result.provider,
			model: result.model,
			latencyMs: result.latencyMs,
			costUsd: result.costUsd,
			usedFallback: result.usedFallback,
			failed: false,
		};
	} catch (error) {
		// Log only the error, never the profile.
		console.warn(
			`[segment] decision failed: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		return {
			decision: decideSegment(null, policy),
			provider: null,
			model: null,
			latencyMs: null,
			costUsd: null,
			usedFallback: false,
			failed: true,
		};
	}
}

export interface ResegmentResult {
	profile: LeadProfile;
	previous: SegmentResult;
	result: SegmentResult;
	/** Fields whose value changed. */
	changed: (keyof LeadProfile)[];
}

function sameValue(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * "Se recalcula cuando cambia su situación": re-runs the segmentation with the updated
 * fields and returns both results so the UI can show what moved.
 */
export async function resegment(
	profile: LeadProfile,
	changes: Partial<LeadProfile>,
	deps: SegmentDeps,
): Promise<ResegmentResult> {
	const updated: LeadProfile = { ...profile, ...changes };
	const changed = (Object.keys(changes) as (keyof LeadProfile)[]).filter(
		(key) => !sameValue(profile[key], updated[key]),
	);
	const [previous, result] = await Promise.all([
		segmentProfile(profile, deps),
		segmentProfile(updated, deps),
	]);
	return { profile: updated, previous, result, changed };
}
