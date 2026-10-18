import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import { reviewBatch } from "@/modules/content-review/application/review-batch";
import { reviewBatchRequestSchema } from "@/modules/content-review/application/review-schemas";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";

/**
 * Reviews the sample dataset (or some ids) with optional policy overrides. The simulated
 * pieces are 30X content, so they are always judged against the default 30X brand.
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

	const parsed = reviewBatchRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{ error: "Petición inválida.", issues: z.treeifyError(parsed.error) },
			{ status: 400 },
		);
	}

	const deps = getReviewDeps();
	const known = new Set(deps.content.map((piece) => piece.id));
	const unknown = parsed.data.ids?.filter((id) => !known.has(id)) ?? [];
	if (unknown.length > 0) {
		return Response.json({ error: `Piezas desconocidas: ${unknown.join(", ")}.` }, { status: 404 });
	}

	const ids = parsed.data.ids ? new Set(parsed.data.ids) : null;
	const decisions = ids
		? deps.content.filter((piece) => ids.has(piece.id)).length
		: deps.content.length;
	const limited = enforceDailyLimit(user, { decisions });
	if (limited) return limited;

	return Response.json(await reviewBatch({ ...parsed.data, brand: getDefaultBrand() }, deps));
}
