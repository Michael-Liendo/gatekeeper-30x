import assert from "node:assert/strict";
import { test } from "node:test";

// Loaded by URL so it runs under `node --test` and type-checks under tsc.
const teamTimeModule = new URL("./team-time.ts", import.meta.url).href;
const { hoursRecoveredPer, TEAM_TIME } = (await import(
	teamTimeModule
)) as typeof import("./team-time");

test("hoursRecoveredPer converts resolved-alone pieces into review hours", () => {
	// 42 of 100 resolved alone × 5 min = 210 min = 3.5 h.
	assert.equal(hoursRecoveredPer({ automationRate: 0.42 }), 3.5);
});

test("hoursRecoveredPer is zero when nothing is resolved alone", () => {
	assert.equal(hoursRecoveredPer({ automationRate: 0 }), 0);
});

test("hoursRecoveredPer follows the tunable assumptions", () => {
	const config = { ...TEAM_TIME, minutesPerManualReview: 10 };
	assert.equal(hoursRecoveredPer({ automationRate: 0.5 }, config), (50 * 10) / 60);
});
