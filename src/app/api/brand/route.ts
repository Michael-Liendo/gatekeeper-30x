import { z } from "zod";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { brandProfileInputSchema } from "@/modules/brand/application/brand-schemas";
import { getBrandByUser, upsertBrand } from "@/modules/brand/infrastructure/brand-repository";
import { listPieces } from "@/modules/workspace/application/piece-workflow";
import { seedDemoPieces } from "@/modules/workspace/application/seed-demo-pieces";
import { getSeedDeps } from "@/modules/workspace/infrastructure/workspace-deps";

const UNAUTHORIZED = { error: "Inicia sesión para continuar." };

/** Brand of the signed-in user. */
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return Response.json(UNAUTHORIZED, { status: 401 });

	const brand = getBrandByUser(user.id);
	if (!brand) {
		return Response.json({ error: "Todavía no configuraste tu marca." }, { status: 404 });
	}
	return Response.json(brand);
}

/**
 * Creates or replaces the signed-in user's brand. On the first save, a person with an
 * empty workspace gets the demo example pieces (reviewed with the new brand).
 */
export async function PUT(request: Request) {
	const user = await getCurrentUser();
	if (!user) return Response.json(UNAUTHORIZED, { status: 401 });

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = brandProfileInputSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: parsed.error.issues[0]?.message ?? "Perfil de marca inválido.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const isFirstSave = getBrandByUser(user.id) === null;
	const brand = upsertBrand(user.id, parsed.data);

	if (isFirstSave) {
		const deps = getSeedDeps();
		if (listPieces(user, undefined, deps).length === 0) {
			try {
				await seedDemoPieces(user, brand, deps);
			} catch (error) {
				// The brand is saved; examples can still be loaded from the empty board.
				console.error("[brand] seeding example pieces failed", error);
			}
		}
	}
	return Response.json(brand);
}
