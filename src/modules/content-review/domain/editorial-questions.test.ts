import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import type { BrandProfile } from "../../brand/domain/brand-profile";

// editorial-questions.ts imports its siblings without an extension (as tsc and the
// bundler expect). Node's ESM resolver needs the extension, so retry with ".ts".
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

const { buildEditorialQuestions, buildContentInput, editorialQuestions, topicLabel } =
	(await import(
		new URL("./editorial-questions.ts", import.meta.url).href
	)) as typeof import("./editorial-questions");
const { defaultBrand } = (await import(
	new URL("../../brand/domain/default-brand.ts", import.meta.url).href
)) as typeof import("../../brand/domain/default-brand");

const brand: BrandProfile = {
	...defaultBrand,
	id: "brand-cafe",
	name: "Café Andino",
	audience: "Amantes del café de especialidad",
	offerings: ["Café en grano", "Cursos de barismo"],
	tone: "Cálido y cercano",
	topics: ["Café", "Recetas", "Origen"],
	forbidden: ["Política", "Apuestas"],
};

describe("buildEditorialQuestions", () => {
	it("keeps the keys the editorial policy depends on", () => {
		assert.deepEqual(Object.keys(buildEditorialQuestions(brand)).sort(), [
			"actionable",
			"brand_risk",
			"editorial_fit",
			"exaggerated_promises",
			"format",
			"is_spam",
			"offers_unsold_product",
			"reach_potential",
			"relevance",
			"too_promotional",
			"topic",
			"unsourced_claims",
		]);
	});

	it("asks editorial fit against the brand's own line, not 30X", () => {
		const { instructions } = buildEditorialQuestions(brand).editorial_fit;
		assert.match(instructions, /línea editorial de Café Andino/);
		assert.doesNotMatch(instructions, /30X/);
	});

	it("lists the brand's offerings in offers_unsold_product", () => {
		const { instructions } = buildEditorialQuestions(brand).offers_unsold_product;
		assert.match(instructions, /Café Andino no vende/);
		assert.match(instructions, /Café Andino vende solo: Café en grano; Cursos de barismo/);
		assert.doesNotMatch(instructions, /30X/);
	});

	it("builds topic options from brand.topics plus other", () => {
		const { options } = buildEditorialQuestions(brand).topic;
		assert.deepEqual(options, {
			topic_1: "Café",
			topic_2: "Recetas",
			topic_3: "Origen",
			other: options.other,
		});
		assert.ok(options.other.length > 0);
	});

	it("keeps a valid choice when the brand has no topics", () => {
		const { options } = buildEditorialQuestions({ ...brand, topics: [] }).topic;
		assert.deepEqual(Object.keys(options), ["topic_1", "other"]);
	});

	it("puts the audience in relevance and tone + forbidden topics in brand_risk", () => {
		const questions = buildEditorialQuestions(brand);
		assert.match(questions.relevance.instructions, /para amantes del café de especialidad\?/);
		assert.match(questions.brand_risk.instructions, /Política; Apuestas/);
		assert.match(questions.brand_risk.instructions, /Cálido y cercano/);
	});

	it("keeps editorialQuestions as the 30X default", () => {
		assert.deepEqual(editorialQuestions, buildEditorialQuestions(defaultBrand));
		assert.match(editorialQuestions.offers_unsold_product.instructions, /Programa de Ventas/);
	});
});

describe("topicLabel", () => {
	it("maps topic keys to the brand's topics", () => {
		assert.equal(topicLabel(brand, "topic_2"), "Recetas");
		assert.equal(topicLabel(brand, "other"), "Otro");
		assert.equal(topicLabel(brand, "topic_9"), "topic_9");
		assert.equal(topicLabel(defaultBrand, "topic_1"), "IA");
	});
});

describe("buildContentInput", () => {
	it("adds the brand name and tone to the state", () => {
		const input = buildContentInput(
			{
				id: "x",
				title: "T",
				body: "B",
				format: "post",
				channel: "linkedin",
				author: "A",
				createdAt: "2026-10-01T00:00:00.000Z",
			},
			brand,
		);
		assert.deepEqual(input.brand, { name: "Café Andino", tone: "Cálido y cercano" });
		assert.equal("author" in input, false);
	});
});
