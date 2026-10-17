import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Loaded by URL so the same file runs under `node --test` (which needs the .ts extension)
// and type-checks under tsc (which rejects .ts extensions in static imports).
const colorsModule = new URL("./color-candidates.ts", import.meta.url).href;
const { colorMentionsFromCss, isNeutralColor, normalizeColor, rankColorCandidates } = (await import(
	colorsModule
)) as typeof import("./color-candidates");

describe("normalizeColor", () => {
	it("normalizes hex and rgb() to #RRGGBB", () => {
		assert.equal(normalizeColor("#abc"), "#AABBCC");
		assert.equal(normalizeColor("#A1b2C3"), "#A1B2C3");
		assert.equal(normalizeColor("#a1b2c3ff"), "#A1B2C3");
		assert.equal(normalizeColor("rgb(235, 255, 111)"), "#EBFF6F");
		assert.equal(normalizeColor("rgba(0,153,255,1)"), "#0099FF");
		assert.equal(normalizeColor("rgb(100% 0% 0% / 0.9)"), "#FF0000");
	});

	it("drops invalid and mostly transparent colors", () => {
		assert.equal(normalizeColor("#ab"), null);
		assert.equal(normalizeColor("red"), null);
		assert.equal(normalizeColor("rgba(0, 0, 0, 0)"), null);
		assert.equal(normalizeColor("rgba(255, 255, 255, 0.5)"), null);
		assert.equal(normalizeColor("#ff000010"), null);
	});
});

describe("isNeutralColor", () => {
	it("flags near-white, near-black and greys", () => {
		for (const hex of ["#FFFFFF", "#FAFAFA", "#000000", "#0A0A0A", "#525252", "#F7F5F2"]) {
			assert.equal(isNeutralColor(hex), true, hex);
		}
		for (const hex of ["#EBFF6F", "#E63946", "#1D3557", "#0099FF"]) {
			assert.equal(isNeutralColor(hex), false, hex);
		}
	});
});

describe("colorMentionsFromCss", () => {
	it("reads declaration values only, not id selectors", () => {
		const css = "#fade { color: #e63946; } /* #123456 */ .a:hover{background:rgb(29,53,87)}";
		const colors = colorMentionsFromCss(css).map((m) => m.color);
		assert.deepEqual(colors, ["#e63946", "rgb(29,53,87)"]);
	});

	it("weighs custom properties double", () => {
		const [token] = colorMentionsFromCss("--brand-primary: #E63946");
		assert.deepEqual(token, { color: "#E63946", weight: 2 });
	});
});

describe("rankColorCandidates", () => {
	it("ranks by frequency and drops neutrals when brand colors exist", () => {
		const ranked = rankColorCandidates([
			"#fff",
			"#ffffff",
			"#000",
			"#1D3557",
			"#e63946",
			"#E63946",
			"rgb(230, 57, 70)",
			"#333333",
		]);
		assert.deepEqual(ranked, ["#E63946", "#1D3557"]);
	});

	it("honors weights and keeps first-seen order on ties", () => {
		const ranked = rankColorCandidates([
			{ color: "#1D3557" },
			{ color: "#2A9D8F" },
			{ color: "#E63946", weight: 10 },
		]);
		assert.deepEqual(ranked, ["#E63946", "#1D3557", "#2A9D8F"]);
	});

	it("puts builder defaults after real brand colors", () => {
		const ranked = rankColorCandidates(["#0099FF", "#0099FF", "#0099FF", "#EBFF6F"]);
		assert.deepEqual(ranked, ["#EBFF6F", "#0099FF"]);
	});

	it("folds near-identical shades into the heaviest one", () => {
		const ranked = rankColorCandidates([
			"#E9FF7B",
			"#EBFF6F",
			"#EBFF6F",
			"#EFFF8F",
			"#1D3557",
			"#1D3557",
			"#1D3557",
		]);
		// Lime shades add up to 4 mentions and outrank the navy (3).
		assert.deepEqual(ranked, ["#EBFF6F", "#1D3557"]);
	});

	it("falls back to neutrals when nothing else is there", () => {
		assert.deepEqual(rankColorCandidates(["#000", "#000", "#fff"]), ["#000000", "#FFFFFF"]);
	});

	it("respects the limit", () => {
		const many = ["#E63946", "#1D3557", "#2A9D8F", "#F4A261", "#8338EC"];
		assert.equal(
			rankColorCandidates(many, {
				limit: 3,
				nearWhiteLightness: 0.94,
				nearBlackLightness: 0.08,
				greySaturation: 0.1,
				minAlpha: 0.5,
				builderDefaults: [],
				mergeDistance: 0,
			}).length,
			3,
		);
	});
});
