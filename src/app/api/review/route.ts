import { z } from "zod";
import { getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import { reviewBatch } from "@/modules/content-review/application/review-batch";
import { reviewBatchRequestSchema } from "@/modules/content-review/application/review-schemas";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";

/**
 * Reviews the sample dataset (or some ids) with optional policy overrides. The simulated
 * pieces are 30X content, so they are always judged against the default 30X brand.
 */
export async function POST(request: Request) {
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

	return Response.json(await reviewBatch({ ...parsed.data, brand: getDefaultBrand() }, deps));
}
