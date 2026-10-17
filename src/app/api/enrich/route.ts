import { z } from "zod";
import type { BrandProfile } from "@/modules/brand/domain/brand-profile";
import { getCurrentBrand, getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import { withSampleImage } from "@/modules/content-review/application/review-batch";
import {
	SuggestionsNotConfiguredError,
	suggestFixesForPiece,
} from "@/modules/content-review/application/review-piece";
import {
	enrichRequestSchema,
	hasImageIssue,
	INVALID_IMAGE_MESSAGE,
} from "@/modules/content-review/application/review-schemas";
import type { ContentPiece } from "@/modules/content-review/domain/content-piece";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";

/**
 * On-demand LLM suggestions ("System Two") for one piece, by sample id or full piece.
 * Sample pieces are 30X content (default brand); pasted pieces use the user's brand.
 */
export async function POST(request: Request) {
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = enrichRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: hasImageIssue(parsed.error)
					? INVALID_IMAGE_MESSAGE
					: "Petición inválida: envía el id de una pieza o la pieza completa.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const deps = getReviewDeps();
	if (!deps.suggest) {
		return Response.json(
			{ error: "Las sugerencias con IA no están configuradas en este entorno." },
			{ status: 503 },
		);
	}

	const { policy, ...input } = parsed.data;
	let piece: ContentPiece | undefined;
	let brand: BrandProfile;
	if ("id" in input) {
		const sample = deps.content.find((p) => p.id === input.id);
		if (!sample) {
			return Response.json({ error: `Pieza desconocida: ${input.id}.` }, { status: 404 });
		}
		// Same image the batch review saw, so the cached decision is reused.
		piece = await withSampleImage(sample, deps.loadImage);
		brand = getDefaultBrand();
	} else {
		brand = (await getCurrentBrand()) ?? getDefaultBrand();
		const now = new Date();
		piece = {
			id: `custom-${now.getTime()}`,
			...input,
			author: "Prueba en vivo",
			createdAt: now.toISOString(),
		};
	}

	try {
		return Response.json(await suggestFixesForPiece(piece, { policy, brand }, deps));
	} catch (error) {
		if (error instanceof SuggestionsNotConfiguredError) {
			return Response.json(
				{ error: "Las sugerencias con IA no están configuradas en este entorno." },
				{ status: 503 },
			);
		}
		console.warn(
			`[enrich] suggestions failed for ${piece.id}: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		return Response.json(
			{ error: "No se pudieron generar sugerencias en este momento. Intenta de nuevo." },
			{ status: 502 },
		);
	}
}
