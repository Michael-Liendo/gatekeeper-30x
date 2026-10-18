import "server-only";
import type { DatabaseSync } from "node:sqlite";
import {
	type ConsumeDecision,
	type DailyLimits,
	DEFAULT_DAILY_LIMITS,
	evaluateConsumption,
	USAGE_BUCKETS,
	USAGE_RETENTION_DAYS,
	type UsageAmounts,
	type UsageBucket,
	type UsageCounts,
	usageDay,
	usageDayMinus,
	withLimitOverrides,
} from "@/modules/accounts/domain/usage-limits";
import { env } from "@/shared/config/env";
import { getDb } from "@/shared/db/sqlite";

const GLOBAL_SCOPE = "global";

function userScope(userId: string): string {
	return `user:${userId}`;
}

export interface BucketUsage {
	used: number;
	limit: number;
	remaining: number;
}

export interface UsageSnapshot {
	day: string;
	user: Record<UsageBucket, BucketUsage>;
	global: Record<UsageBucket, BucketUsage>;
}

export interface UsageRepository {
	/**
	 * Reserves `amounts` for the user and globally, atomically: either every bucket fits
	 * in both its user and its global limit and all counters move, or nothing changes.
	 */
	tryConsume(userId: string, amounts: UsageAmounts): ConsumeDecision;
	/** Today's counters and limits for the user and for everyone. */
	snapshot(userId: string): UsageSnapshot;
}

/** usage_counters access. `limits` and `now` are injectable for tests. */
export function createUsageRepository(
	db: DatabaseSync,
	limits: DailyLimits,
	now: () => Date = () => new Date(),
): UsageRepository {
	const selectCounts = db.prepare(
		"SELECT bucket, count FROM usage_counters WHERE day = ? AND scope = ?",
	);
	const increment = db.prepare(
		`INSERT INTO usage_counters (day, scope, bucket, count) VALUES (?, ?, ?, ?)
		 ON CONFLICT (day, scope, bucket) DO UPDATE SET count = count + excluded.count`,
	);
	const prune = db.prepare("DELETE FROM usage_counters WHERE day < ?");

	function counts(day: string, scope: string): UsageCounts {
		const rows = selectCounts.all(day, scope) as { bucket: string; count: number }[];
		const result: UsageCounts = {};
		for (const row of rows) {
			if ((USAGE_BUCKETS as readonly string[]).includes(row.bucket)) {
				result[row.bucket as UsageBucket] = row.count;
			}
		}
		return result;
	}

	function describe(used: UsageCounts, scope: "user" | "global") {
		const result = {} as Record<UsageBucket, BucketUsage>;
		for (const bucket of USAGE_BUCKETS) {
			const count = used[bucket] ?? 0;
			const limit = limits[bucket][scope];
			result[bucket] = { used: count, limit, remaining: Math.max(0, limit - count) };
		}
		return result;
	}

	return {
		tryConsume(userId, amounts) {
			const at = now();
			const day = usageDay(at);
			const scope = userScope(userId);
			// IMMEDIATE takes the write lock up front, so two processes can't both pass the check.
			db.exec("BEGIN IMMEDIATE");
			try {
				const decision = evaluateConsumption(limits, amounts, {
					user: counts(day, scope),
					global: counts(day, GLOBAL_SCOPE),
				});
				if (decision.ok) {
					for (const bucket of USAGE_BUCKETS) {
						const amount = amounts[bucket] ?? 0;
						if (amount <= 0) continue;
						increment.run(day, scope, bucket, amount);
						increment.run(day, GLOBAL_SCOPE, bucket, amount);
					}
					prune.run(usageDayMinus(at, USAGE_RETENTION_DAYS));
				}
				db.exec("COMMIT");
				return decision;
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},
		snapshot(userId) {
			const day = usageDay(now());
			return {
				day,
				user: describe(counts(day, userScope(userId)), "user"),
				global: describe(counts(day, GLOBAL_SCOPE), "global"),
			};
		},
	};
}

/** The default limits with the DAILY_LIMIT_* env overrides applied. */
export function configuredDailyLimits(): DailyLimits {
	return withLimitOverrides(DEFAULT_DAILY_LIMITS, {
		decisions: {
			user: env.DAILY_LIMIT_DECISIONS_USER,
			global: env.DAILY_LIMIT_DECISIONS_GLOBAL,
		},
		llm: { user: env.DAILY_LIMIT_LLM_USER, global: env.DAILY_LIMIT_LLM_GLOBAL },
		images: { user: env.DAILY_LIMIT_IMAGES_USER, global: env.DAILY_LIMIT_IMAGES_GLOBAL },
	});
}

let defaultRepository: UsageRepository | undefined;

/** Repository bound to the app database and the configured limits. */
export function usageRepository(): UsageRepository {
	defaultRepository ??= createUsageRepository(getDb(), configuredDailyLimits());
	return defaultRepository;
}
