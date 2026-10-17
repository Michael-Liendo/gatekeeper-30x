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

const schemasModule = new URL("./review-schemas.ts", import.meta.url).href;
const {
	reviewCustomPieceRequestSchema,
	enrichRequestSchema,
	hasImageIssue,
	DEFAULT_CUSTOM_TITLE,
	MISSING_CONTENT_MESSAGE,
} = (await import(schemasModule)) as typeof import("./review-schemas");

const PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const base = { format: "post", channel: "instagram" } as const;

describe("reviewCustomPieceRequestSchema", () => {
	it("accepts an image-only piece and defaults the title", () => {
		const parsed = reviewCustomPieceRequestSchema.safeParse({
			...base,
			imageDataUrl: `data:image/png;base64,${PNG_BASE64}`,
		});
		assert.ok(parsed.success);
		assert.equal(parsed.data.title, DEFAULT_CUSTOM_TITLE);
		assert.equal(parsed.data.body, "");
	});

	it("still accepts a text-only piece", () => {
		const parsed = reviewCustomPieceRequestSchema.safeParse({ ...base, title: "T", body: "Texto" });
		assert.ok(parsed.success);
		assert.equal(parsed.data.imageDataUrl, undefined);
	});

	it("requires text or an image", () => {
		const parsed = reviewCustomPieceRequestSchema.safeParse({ ...base, title: "T", body: "  " });
		assert.equal(parsed.success, false);
		assert.ok(parsed.error?.issues.some((i) => i.message === MISSING_CONTENT_MESSAGE));
		assert.equal(parsed.error && hasImageIssue(parsed.error), false);
	});

	for (const [label, imageDataUrl] of [
		["a WebP data URL", `data:image/webp;base64,${PNG_BASE64}`],
		["a URL without the data prefix", PNG_BASE64],
		["invalid base64", "data:image/png;base64,not base64!"],
		[
			"an image over 4 MB",
			`data:image/jpeg;base64,${"A".repeat(Math.ceil((4 * 1024 * 1024 + 3) / 3) * 4)}`,
		],
	] as const) {
		it(`rejects ${label} as an image issue`, () => {
			const parsed = reviewCustomPieceRequestSchema.safeParse({ ...base, body: "x", imageDataUrl });
			assert.equal(parsed.success, false);
			assert.ok(parsed.error && hasImageIssue(parsed.error));
		});
	}
});

describe("enrichRequestSchema", () => {
	it("flags an invalid image inside the union", () => {
		const parsed = enrichRequestSchema.safeParse({
			...base,
			imageDataUrl: "data:image/gif;base64,AAAA",
		});
		assert.equal(parsed.success, false);
		assert.ok(parsed.error && hasImageIssue(parsed.error));
	});
});
