import { z } from "zod";
import {
	customPieceSchema,
	DEFAULT_CUSTOM_TITLE,
	imageDataUrlSchema,
	MAX_CUSTOM_BODY_LENGTH,
} from "../../content-review/application/review-schemas";
import { PIECE_STATUSES, type PieceStatus, TEAM_ROLES } from "../domain/workspace";

/** POST /api/pieces: same fields and rules as the live test (text, screenshot or both). */
export const submitPieceSchema = customPieceSchema;

export type SubmitPieceInput = z.infer<typeof submitPieceSchema>;

export const pieceStatusSchema = z.enum(PIECE_STATUSES, {
	message: "Estado inválido: usa in_review, needs_changes, approved o rejected.",
});

/** PATCH /api/pieces/[id]. */
export const changeStatusSchema = z.object({
	status: pieceStatusSchema,
	note: z
		.string()
		.trim()
		.max(500, "La nota admite hasta 500 caracteres.")
		.optional()
		.transform((note) => note || undefined),
});

export interface ChangeStatusInput {
	status: PieceStatus;
	note?: string;
}

/** POST /api/pieces/[id]/versions. Without `imageDataUrl` the previous screenshot is kept. */
export const newVersionSchema = z.object({
	title: z
		.string()
		.trim()
		.max(300)
		.optional()
		.transform((title) => title || DEFAULT_CUSTOM_TITLE),
	body: z.string().trim().max(MAX_CUSTOM_BODY_LENGTH).optional().default(""),
	changes: z.array(z.string().trim().min(1).max(300)).max(20).optional().default([]),
	imageDataUrl: imageDataUrlSchema.optional(),
});

export interface NewVersionInput {
	title: string;
	body: string;
	changes?: string[];
	imageDataUrl?: string;
}

/** PATCH /api/me. */
export const updateRoleSchema = z.object({
	role: z.enum(TEAM_ROLES, { message: "Rol inválido: usa design, copy, editor u other." }),
});
