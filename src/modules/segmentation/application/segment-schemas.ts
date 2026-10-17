import { z } from "zod";
import { estimateInfoLevel, type LeadProfile } from "../domain/profile";

export const BATCH_SIZES = [50, 100, 200] as const;
export const DEFAULT_BATCH_SIZE = 100;

export const segmentRunSchema = z
	.object({
		size: z
			.number()
			.refine((value) => (BATCH_SIZES as readonly number[]).includes(value), {
				error: "El tamaño debe ser 50, 100 o 200.",
			})
			.optional(),
	})
	.strict();

const field = z.string().trim().max(120, "Máximo 120 caracteres.");

const profileFields = {
	rol: field,
	pais: field,
	dolor: field,
	objetivo: field.min(1, "Indica el objetivo principal."),
	temas: z.array(z.string().trim().min(1).max(40)).max(15, "Máximo 15 temas."),
	relacion: field,
};

/** A new sign-up from the "Nuevo inscrito" form. Labels are not accepted here. */
export const leadProfileSchema = z.object(profileFields).strict();

export const segmentProfileRequestSchema = leadProfileSchema
	.extend({
		/** "Cambió su situación": fields to update before recalculating. */
		cambios: z.object(profileFields).partial().strict().optional(),
	})
	.strict();

export type LeadProfileInput = z.infer<typeof leadProfileSchema>;

/** Form input → profile, with "Nivel de info" estimated by code. */
export function toLeadProfile(input: LeadProfileInput): LeadProfile {
	const base = { ...input, temas: [...input.temas] };
	return { ...base, nivelInfo: estimateInfoLevel(base) };
}
