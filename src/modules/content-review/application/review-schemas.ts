import { z } from "zod";
import { MAX_IMAGE_BYTES, parseImageDataUrl } from "../domain/content-image";

/** Max body length for a piece pasted by the user. */
export const MAX_CUSTOM_BODY_LENGTH = 4000;

const unit = z.number().min(0).max(1);

/** Partial threshold/weight overrides sent by the rules panel. */
export const policyOverridesSchema = z
	.object({
		autoApproveConfidence: unit,
		grayZoneFloor: unit,
		riskBlock: unit,
		spamReject: unit,
		minEditorialScore: unit,
		flagThreshold: unit,
		weights: z
			.object({ relevance: unit, actionable: unit, promotional: unit, unsourced: unit })
			.partial()
			.strict(),
	})
	.partial()
	.strict();

export const reviewBatchRequestSchema = z.object({
	ids: z.array(z.string().min(1)).max(500).optional(),
	policy: policyOverridesSchema.optional(),
	enrich: z.boolean().optional(),
});

/** Title used when a piece (typically a screenshot) arrives without one. */
export const DEFAULT_CUSTOM_TITLE = "Captura sin título";

/** User-facing error for a screenshot with the wrong type or size. */
export const INVALID_IMAGE_MESSAGE = "Solo PNG o JPG de hasta 4 MB";

/** User-facing error when neither text nor a screenshot is sent. */
export const MISSING_CONTENT_MESSAGE = "Envía el texto de la pieza o una captura.";

/** Longest base64 data URL that can decode to MAX_IMAGE_BYTES (plus the prefix). */
const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32;

/** PNG/JPEG base64 `data:` URL of at most 4 MB decoded. */
export const imageDataUrlSchema = z
	.string()
	.max(MAX_IMAGE_DATA_URL_LENGTH, { message: INVALID_IMAGE_MESSAGE })
	.refine((value) => parseImageDataUrl(value) !== null, { message: INVALID_IMAGE_MESSAGE });

/**
 * Fields of a piece the user pastes (or uploads as a screenshot) in the live test.
 * Text, image or both; `requireContent` enforces that at least one is present.
 */
const customPieceFields = z.object({
	title: z
		.string()
		.trim()
		.max(300)
		.optional()
		.transform((title) => title || DEFAULT_CUSTOM_TITLE),
	body: z.string().trim().max(MAX_CUSTOM_BODY_LENGTH).optional().default(""),
	format: z.enum(["post", "video_script", "clip", "newsletter"]),
	channel: z.enum(["linkedin", "instagram", "youtube", "x", "newsletter", "blog"]),
	imageDataUrl: imageDataUrlSchema.optional(),
});

function requireContent(piece: { body: string; imageDataUrl?: string }, ctx: z.RefinementCtx) {
	if (!piece.body && !piece.imageDataUrl) {
		ctx.addIssue({ code: "custom", path: ["body"], message: MISSING_CONTENT_MESSAGE });
	}
}

export const customPieceSchema = customPieceFields.superRefine(requireContent);

export const reviewCustomPieceRequestSchema = customPieceFields
	.extend({
		policy: policyOverridesSchema.optional(),
		enrich: z.boolean().optional(),
	})
	.superRefine(requireContent);

export const enrichRequestSchema = z.union([
	z.object({ id: z.string().min(1), policy: policyOverridesSchema.optional() }),
	customPieceFields
		.extend({ policy: policyOverridesSchema.optional() })
		.superRefine(requireContent),
]);

/** True when validation failed because of the screenshot (wrong type or size). */
export function hasImageIssue(error: z.ZodError): boolean {
	return error.issues.some(
		(issue) =>
			issue.path[0] === "imageDataUrl" ||
			(issue.code === "invalid_union" &&
				issue.errors.some((branch) => branch.some((i) => i.path[0] === "imageDataUrl"))),
	);
}
