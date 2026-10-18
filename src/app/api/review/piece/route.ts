import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { getCurrentBrand, getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import { reviewPiece } from "@/modules/content-review/application/review-piece";
import {
	hasImageIssue,
	INVALID_IMAGE_MESSAGE,
	reviewCustomPieceRequestSchema,
} from "@/modules/content-review/application/review-schemas";
import type { ContentPiece } from "@/modules/content-review/domain/content-piece";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";

/**
 * Reviews a piece pasted by the user in the live test ("Prueba en vivo"): text, a PNG/JPEG
 * screenshot as a `data:` URL (max 4 MB decoded), or both. Route handlers have no body size
 * limit of their own (only `proxyClientMaxBodySize`, 10 MB, applies if a proxy is added).
 * The piece is judged against the signed-in user's brand (30X when there is none).
 */
export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = reviewCustomPieceRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: hasImageIssue(parsed.error)
					? INVALID_IMAGE_MESSAGE
					: "Petición inválida: envía texto (máx. 4000 caracteres) o una captura, y revisa formato y canal.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const { policy, enrich, ...fields } = parsed.data;
	const now = new Date();
	const piece: ContentPiece = {
		id: `custom-${now.getTime()}`,
		...fields,
		author: "Prueba en vivo",
		createdAt: now.toISOString(),
	};

	// Suggestions only run for gray-zone pieces, but are reserved up front.
	const limited = enforceDailyLimit(user, { decisions: 1, llm: enrich ? 1 : 0 });
	if (limited) return limited;

	const brand = (await getCurrentBrand()) ?? getDefaultBrand();
	return Response.json(await reviewPiece(piece, { policy, enrich, brand }, getReviewDeps()));
}
