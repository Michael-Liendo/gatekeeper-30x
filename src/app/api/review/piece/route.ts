import { z } from "zod";
import { reviewPiece } from "@/modules/content-review/application/review-piece";
import { reviewCustomPieceRequestSchema } from "@/modules/content-review/application/review-schemas";
import type { ContentPiece } from "@/modules/content-review/domain/content-piece";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";

/** Reviews a piece pasted by the user in the live test ("Prueba en vivo"). */
export async function POST(request: Request) {
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
				error: "Petición inválida: revisa título, texto (máx. 4000 caracteres), formato y canal.",
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

	return Response.json(await reviewPiece(piece, { policy, enrich }, getReviewDeps()));
}
