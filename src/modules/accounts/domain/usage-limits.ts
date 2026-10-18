/**
 * Daily usage limits that protect the owner's provider keys (TypeSafe/JEV and OpenAI).
 * Pure: no I/O. Counting happens in the usage repository; this file holds the rules.
 *
 * A "day" is the UTC calendar day: it resets at 00:00 UTC (19:00 in Bogotá).
 */

/** What a request spends. One unit = one provider call. */
export const USAGE_BUCKETS = ["decisions", "llm", "images"] as const;
export type UsageBucket = (typeof USAGE_BUCKETS)[number];

export interface BucketLimit {
	/** Max units one user can spend per day. */
	user: number;
	/** Max units all users together can spend per day. */
	global: number;
}

export type DailyLimits = Readonly<Record<UsageBucket, BucketLimit>>;

/**
 * Generous defaults: normal demo use (jury, team) never gets close. Data, not code:
 * tune them here or override them with DAILY_LIMIT_<BUCKET>_<USER|GLOBAL>.
 */
export const DEFAULT_DAILY_LIMITS: DailyLimits = {
	/** JEV / OpenAI decisions: one per reviewed piece or segmented profile. */
	decisions: { user: 20_000, global: 200_000 },
	/** OpenAI Responses: suggestions, rewrites, brand extraction. */
	llm: { user: 300, global: 3_000 },
	/** gpt-image regenerations. */
	images: { user: 30, global: 300 },
};

/** How many past days of counters are kept; older rows are pruned on write. */
export const USAGE_RETENTION_DAYS = 7;

export type LimitOverrides = Partial<Record<UsageBucket, Partial<BucketLimit>>>;

/** `base` with the given overrides applied (undefined values keep the default). */
export function withLimitOverrides(base: DailyLimits, overrides: LimitOverrides): DailyLimits {
	const result = {} as Record<UsageBucket, BucketLimit>;
	for (const bucket of USAGE_BUCKETS) {
		result[bucket] = {
			user: overrides[bucket]?.user ?? base[bucket].user,
			global: overrides[bucket]?.global ?? base[bucket].global,
		};
	}
	return result;
}

/** The usage day of `date` as `YYYY-MM-DD` (UTC). */
export function usageDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** The usage day `days` days before `date`'s. */
export function usageDayMinus(date: Date, days: number): string {
	return usageDay(new Date(date.getTime() - days * 24 * 60 * 60 * 1000));
}

/** Whole seconds until the next usage day starts (at least 1). */
export function secondsUntilNextUsageDay(date: Date): number {
	const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
	return Math.max(1, Math.ceil((next - date.getTime()) / 1000));
}

export type UsageAmounts = Partial<Record<UsageBucket, number>>;
export type UsageCounts = Partial<Record<UsageBucket, number>>;

export type UsageScope = "user" | "global";

export type ConsumeDecision =
	| { ok: true }
	| {
			ok: false;
			bucket: UsageBucket;
			scope: UsageScope;
			limit: number;
			remaining: number;
	  };

/**
 * Whether spending `amounts` fits in today's limits, given what was already used.
 * All or nothing: one bucket over its user or global limit rejects the whole request.
 * The user limit is checked first, so a person sees their own limit when both are hit.
 */
export function evaluateConsumption(
	limits: DailyLimits,
	amounts: UsageAmounts,
	used: { user: UsageCounts; global: UsageCounts },
): ConsumeDecision {
	for (const bucket of USAGE_BUCKETS) {
		const amount = amounts[bucket] ?? 0;
		if (amount <= 0) continue;
		for (const scope of ["user", "global"] as const) {
			const limit = limits[bucket][scope];
			const remaining = Math.max(0, limit - (used[scope][bucket] ?? 0));
			if (amount > remaining) return { ok: false, bucket, scope, limit, remaining };
		}
	}
	return { ok: true };
}
