import { z } from "zod";

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

/** Fields of a piece the user pastes in the live test. */
export const customPieceSchema = z.object({
	title: z.string().trim().min(1).max(300),
	body: z.string().trim().min(1).max(MAX_CUSTOM_BODY_LENGTH),
	format: z.enum(["post", "video_script", "clip", "newsletter"]),
	channel: z.enum(["linkedin", "instagram", "youtube", "x", "newsletter", "blog"]),
});

export const reviewCustomPieceRequestSchema = customPieceSchema.extend({
	policy: policyOverridesSchema.optional(),
	enrich: z.boolean().optional(),
});

export const enrichRequestSchema = z.union([
	z.object({ id: z.string().min(1), policy: policyOverridesSchema.optional() }),
	customPieceSchema.extend({ policy: policyOverridesSchema.optional() }),
]);
