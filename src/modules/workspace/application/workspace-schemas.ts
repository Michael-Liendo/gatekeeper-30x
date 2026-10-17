import { z } from "zod";
import {
	customPieceSchema,
	DEFAULT_CUSTOM_TITLE,
	imageDataUrlSchema,
	MAX_CUSTOM_BODY_LENGTH,
} from "../../content-review/application/review-schemas";
import { GRID_LIMITS } from "../domain/content-grid";
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

/** One piece of a content grid (POST /api/pieces/bulk). Text is required: no screenshots. */
export const bulkPieceSchema = z.object({
	title: z
		.string()
		.trim()
		.max(GRID_LIMITS.maxTitleLength)
		.optional()
		.transform((title) => title || undefined),
	body: z
		.string()
		.trim()
		.min(1, "Falta el texto de la pieza.")
		.max(
			GRID_LIMITS.maxBodyLength,
			`El texto admite hasta ${GRID_LIMITS.maxBodyLength} caracteres.`,
		),
	format: z.enum(["post", "video_script", "clip", "newsletter"], {
		message: "Formato inválido: usa post, video_script, clip o newsletter.",
	}),
	channel: z.enum(["linkedin", "instagram", "youtube", "x", "newsletter", "blog"], {
		message: "Canal inválido: usa instagram, linkedin, youtube, x, newsletter o blog.",
	}),
	scheduledFor: z.iso.date("La fecha debe tener el formato aaaa-mm-dd.").optional(),
	notes: z
		.string()
		.trim()
		.max(GRID_LIMITS.maxNotesLength)
		.optional()
		.transform((notes) => notes || undefined),
});

/** POST /api/pieces/bulk: up to GRID_LIMITS.maxRows pieces of one campaign. */
export const bulkUploadSchema = z.object({
	campaign: z
		.string()
		.trim()
		.max(120, "El nombre de la campaña admite hasta 120 caracteres.")
		.optional()
		.transform((campaign) => campaign || undefined),
	pieces: z
		.array(bulkPieceSchema)
		.min(1, "La grilla no tiene piezas para revisar.")
		.max(GRID_LIMITS.maxRows, `Puedes cargar hasta ${GRID_LIMITS.maxRows} piezas por grilla.`),
});

export interface BulkPieceInput {
	title?: string;
	body: string;
	format: z.infer<typeof bulkPieceSchema>["format"];
	channel: z.infer<typeof bulkPieceSchema>["channel"];
	scheduledFor?: string;
	notes?: string;
}

export interface BulkUploadInput {
	campaign?: string;
	pieces: BulkPieceInput[];
}

/** First problem of an invalid bulk request, in Spanish: "Pieza 3: Falta el texto…". */
export function bulkUploadErrorMessage(error: z.ZodError): string {
	const issue = error.issues[0];
	if (!issue) return "Petición inválida: revisa las piezas de la grilla.";
	const [root, index] = issue.path;
	const message =
		issue.code === "invalid_type" ? "Falta un dato obligatorio o tiene otro tipo." : issue.message;
	return root === "pieces" && typeof index === "number"
		? `Pieza ${index + 1}: ${message}`
		: message;
}
