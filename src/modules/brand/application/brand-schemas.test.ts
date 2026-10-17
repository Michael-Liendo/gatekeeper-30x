import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";

// Same resolver hook as review-piece.test.ts: retry extensionless relative imports with ".ts".
registerHooks({
	resolve(specifier, context, nextResolve) {
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

const schemasModule = new URL("./brand-schemas.ts", import.meta.url).href;
const { brandProfileInputSchema } = (await import(
	schemasModule
)) as typeof import("./brand-schemas");

const valid = {
	name: "  Acme  ",
	description: "Hacemos cosas.",
	audience: "Equipos",
	offerings: ["Curso", "  ", "Mentoría "],
	tone: "Directo",
	topics: ["Ventas"],
	forbidden: [],
	colors: ["#111111", "#FF5a1f"],
	links: ["https://acme.com"],
};

describe("brandProfileInputSchema", () => {
	it("trims strings and drops blank list items", () => {
		const parsed = brandProfileInputSchema.parse(valid);
		assert.equal(parsed.name, "Acme");
		assert.deepEqual(parsed.offerings, ["Curso", "Mentoría"]);
		assert.equal(parsed.logoUrl, undefined);
	});

	it("defaults missing optional fields", () => {
		const parsed = brandProfileInputSchema.parse({ name: "Acme" });
		assert.equal(parsed.description, "");
		assert.deepEqual(parsed.topics, []);
		assert.deepEqual(parsed.colors, []);
	});

	it("requires a name of 1-80 chars", () => {
		assert.equal(brandProfileInputSchema.safeParse({ ...valid, name: "   " }).success, false);
		assert.equal(
			brandProfileInputSchema.safeParse({ ...valid, name: "x".repeat(81) }).success,
			false,
		);
	});

	it("limits lists to 20 items of 120 chars", () => {
		const many = Array.from({ length: 21 }, (_, i) => `t${i}`);
		assert.equal(brandProfileInputSchema.safeParse({ ...valid, topics: many }).success, false);
		const long = ["x".repeat(121)];
		assert.equal(brandProfileInputSchema.safeParse({ ...valid, topics: long }).success, false);
	});

	it("validates hex colors (max 6)", () => {
		for (const color of ["#fff", "red", "#12345g", "111111"]) {
			assert.equal(brandProfileInputSchema.safeParse({ ...valid, colors: [color] }).success, false);
		}
		const seven = Array.from({ length: 7 }, () => "#000000");
		assert.equal(brandProfileInputSchema.safeParse({ ...valid, colors: seven }).success, false);
	});

	it("accepts only http(s) links (max 5) and an optional logo URL", () => {
		assert.equal(
			brandProfileInputSchema.safeParse({ ...valid, links: ["javascript:alert(1)"] }).success,
			false,
		);
		assert.equal(
			brandProfileInputSchema.safeParse({ ...valid, links: ["acme.com"] }).success,
			false,
		);
		const six = Array.from({ length: 6 }, (_, i) => `https://a${i}.com`);
		assert.equal(brandProfileInputSchema.safeParse({ ...valid, links: six }).success, false);
		const withLogo = brandProfileInputSchema.parse({ ...valid, logoUrl: "https://acme.com/l.png" });
		assert.equal(withLogo.logoUrl, "https://acme.com/l.png");
		assert.equal(brandProfileInputSchema.parse({ ...valid, logoUrl: "" }).logoUrl, undefined);
	});

	it("rejects a non-string name with a Spanish message", () => {
		const result = brandProfileInputSchema.safeParse({ ...valid, name: "" });
		assert.equal(result.success, false);
		assert.match(result.error?.issues[0]?.message ?? "", /nombre/);
	});
});
