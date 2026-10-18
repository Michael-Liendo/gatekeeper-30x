import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
	DEFAULT_DAILY_LIMITS,
	evaluateConsumption,
	secondsUntilNextUsageDay,
	usageDay,
	usageDayMinus,
	withLimitOverrides,
} = (await import(
	new URL("./usage-limits.ts", import.meta.url).href
)) as typeof import("./usage-limits");

const limits = withLimitOverrides(DEFAULT_DAILY_LIMITS, {
	decisions: { user: 10, global: 15 },
	images: { user: 0 },
});

describe("usage limits", () => {
	it("defaults are generous", () => {
		assert.deepEqual(DEFAULT_DAILY_LIMITS, {
			decisions: { user: 20_000, global: 200_000 },
			llm: { user: 300, global: 3_000 },
			images: { user: 30, global: 300 },
		});
	});

	it("overrides replace only the given values", () => {
		assert.deepEqual(limits.decisions, { user: 10, global: 15 });
		assert.deepEqual(limits.images, { user: 0, global: 300 });
		assert.deepEqual(limits.llm, DEFAULT_DAILY_LIMITS.llm);
	});

	it("allows what fits, exactly up to the limit", () => {
		const used = { user: { decisions: 4 }, global: { decisions: 4 } };
		assert.deepEqual(evaluateConsumption(limits, { decisions: 6 }, used), { ok: true });
		assert.deepEqual(evaluateConsumption(limits, {}, used), { ok: true });
	});

	it("rejects over the user limit with the remaining amount", () => {
		const used = { user: { decisions: 8 }, global: { decisions: 8 } };
		assert.deepEqual(evaluateConsumption(limits, { decisions: 3 }, used), {
			ok: false,
			bucket: "decisions",
			scope: "user",
			limit: 10,
			remaining: 2,
		});
	});

	it("rejects over the global limit even when the user has room", () => {
		const used = { user: {}, global: { decisions: 15 } };
		const decision = evaluateConsumption(limits, { decisions: 1 }, used);
		assert.equal(decision.ok, false);
		assert.equal(!decision.ok && decision.scope, "global");
	});

	it("a zero limit blocks the bucket; zero amounts are free", () => {
		const used = { user: {}, global: {} };
		const decision = evaluateConsumption(limits, { images: 1 }, used);
		assert.equal(!decision.ok && decision.bucket, "images");
		assert.deepEqual(evaluateConsumption(limits, { images: 0, llm: 1 }, used), { ok: true });
	});

	it("days are UTC calendar days", () => {
		// 23:30 in Bogotá (UTC-5) is already the next UTC day.
		const late = new Date("2026-10-18T04:30:00Z");
		assert.equal(usageDay(late), "2026-10-18");
		assert.equal(usageDayMinus(late, 7), "2026-10-11");
		assert.equal(secondsUntilNextUsageDay(new Date("2026-10-18T23:59:00Z")), 60);
		assert.equal(secondsUntilNextUsageDay(new Date("2026-10-18T00:00:00Z")), 86_400);
	});
});
