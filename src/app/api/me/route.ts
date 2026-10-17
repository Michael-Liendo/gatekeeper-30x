import { z } from "zod";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { userRepository } from "@/modules/accounts/infrastructure/user-repository";
import { getBrandByUser } from "@/modules/brand/infrastructure/brand-repository";
import { updateRoleSchema } from "@/modules/workspace/application/workspace-schemas";

const UNAUTHORIZED = { error: "Inicia sesión para continuar." };

/** The signed-in user and their brand (null until onboarding is done). */
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return Response.json(UNAUTHORIZED, { status: 401 });
	return Response.json({ user, brand: getBrandByUser(user.id) });
}

/** Sets the user's role in the creative team: `{ role }` → `{ user }`. */
export async function PATCH(request: Request) {
	const user = await getCurrentUser();
	if (!user) return Response.json(UNAUTHORIZED, { status: 401 });

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = updateRoleSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: parsed.error.issues[0]?.message ?? "Rol inválido.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const updated = userRepository().updateRole(user.id, parsed.data.role);
	if (!updated) return Response.json(UNAUTHORIZED, { status: 401 });
	return Response.json({ user: updated });
}
