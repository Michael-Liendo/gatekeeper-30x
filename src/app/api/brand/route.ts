import { z } from "zod";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { brandProfileInputSchema } from "@/modules/brand/application/brand-schemas";
import { getBrandByUser, upsertBrand } from "@/modules/brand/infrastructure/brand-repository";

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

/** Creates or replaces the signed-in user's brand. */
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

	return Response.json(upsertBrand(user.id, parsed.data));
}
