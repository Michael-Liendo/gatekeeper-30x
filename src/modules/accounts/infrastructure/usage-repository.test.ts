import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

// Same hooks as src/shared/db/repositories.test.ts: "@/..." → src/, ".ts" suffix, no server-only.
const srcDir = path.resolve(import.meta.dirname, "../../..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "server-only") {
			return { url: "data:text/javascript,export {};", shortCircuit: true };
		}
		if (specifier.startsWith("@/")) {
			return nextResolve(
				`${pathToFileURL(path.join(srcDir, specifier.slice(2))).href}.ts`,
				context,
			);
		}
		try {
			return nextResolve(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
});

// Env overrides are read once, when the env module loads.
process.env.DAILY_LIMIT_IMAGES_USER = "0";
process.env.DAILY_LIMIT_LLM_GLOBAL = "42";
process.env.DAILY_LIMIT_DECISIONS_USER = "";

const dir = mkdtempSync(path.join(tmpdir(), "gatekeeper-usage-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const { openDatabase } = (await import(
	new URL("../../../shared/db/sqlite.ts", import.meta.url).href
)) as typeof import("../../../shared/db/sqlite");
const { createUsageRepository, configuredDailyLimits } = (await import(
	new URL("./usage-repository.ts", import.meta.url).href
)) as typeof import("./usage-repository");
const { DEFAULT_DAILY_LIMITS, withLimitOverrides } = (await import(
	new URL("../domain/usage-limits.ts", import.meta.url).href
)) as typeof import("../domain/usage-limits");

const db = openDatabase(dir);
after(() => db.close());

const limits = withLimitOverrides(DEFAULT_DAILY_LIMITS, {
	decisions: { user: 10, global: 25 },
	images: { user: 2, global: 3 },
});

function countRows(scope: string, bucket: string): number {
	const row = db
		.prepare(
			"SELECT COALESCE(SUM(count), 0) AS n FROM usage_counters WHERE scope = ? AND bucket = ?",
		)
		.get(scope, bucket) as { n: number };
	return row.n;
}

describe("usage repository", () => {
	it("enforces the per-user limit and counts user and global together", () => {
		const usage = createUsageRepository(db, limits, () => new Date("2026-10-18T10:00:00Z"));
		assert.equal(usage.tryConsume("u1", { decisions: 6 }).ok, true);
		assert.equal(usage.tryConsume("u1", { decisions: 4 }).ok, true);
		const rejected = usage.tryConsume("u1", { decisions: 1 });
		assert.deepEqual(rejected, {
			ok: false,
			bucket: "decisions",
			scope: "user",
			limit: 10,
			remaining: 0,
		});
		const snapshot = usage.snapshot("u1");
		assert.equal(snapshot.day, "2026-10-18");
		assert.deepEqual(snapshot.user.decisions, { used: 10, limit: 10, remaining: 0 });
		assert.deepEqual(snapshot.global.decisions, { used: 10, limit: 25, remaining: 15 });
	});

	it("enforces the global limit across users", () => {
		const usage = createUsageRepository(db, limits, () => new Date("2026-10-18T11:00:00Z"));
		assert.equal(usage.tryConsume("u2", { decisions: 10 }).ok, true);
		const rejected = usage.tryConsume("u3", { decisions: 6 });
		assert.equal(!rejected.ok && rejected.scope, "global");
		assert.equal(!rejected.ok && rejected.remaining, 5);
		assert.equal(usage.tryConsume("u3", { decisions: 5 }).ok, true);
	});

	it("is all or nothing across buckets", () => {
		const usage = createUsageRepository(db, limits, () => new Date("2026-10-18T12:00:00Z"));
		assert.equal(usage.tryConsume("u4", { images: 2 }).ok, true);
		const rejected = usage.tryConsume("u4", { llm: 1, images: 1 });
		assert.equal(!rejected.ok && rejected.bucket, "images");
		assert.equal(countRows("user:u4", "llm"), 0);
		assert.equal(countRows("user:u4", "images"), 2);
		assert.equal(db.isTransaction, false);
	});

	it("starts over on a new UTC day and prunes days older than a week", () => {
		let now = new Date("2026-10-18T23:59:59Z");
		const usage = createUsageRepository(db, limits, () => now);
		assert.equal(usage.tryConsume("u1", { decisions: 1 }).ok, false);
		now = new Date("2026-10-19T00:00:00Z");
		assert.equal(usage.tryConsume("u1", { decisions: 10 }).ok, true);
		assert.equal(usage.snapshot("u1").user.decisions.used, 10);

		now = new Date("2026-10-26T08:00:00Z");
		assert.equal(usage.tryConsume("u1", { llm: 1 }).ok, true);
		const days = db.prepare("SELECT DISTINCT day FROM usage_counters ORDER BY day").all() as {
			day: string;
		}[];
		assert.deepEqual(
			days.map((d) => d.day),
			["2026-10-19", "2026-10-26"],
		);
	});

	it("applies DAILY_LIMIT_* env overrides (empty keeps the default)", () => {
		const configured = configuredDailyLimits();
		assert.deepEqual(configured.images, { user: 0, global: 300 });
		assert.deepEqual(configured.llm, { user: 300, global: 42 });
		assert.deepEqual(configured.decisions, DEFAULT_DAILY_LIMITS.decisions);
	});
});
