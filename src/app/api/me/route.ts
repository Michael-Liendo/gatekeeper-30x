import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { getBrandByUser } from "@/modules/brand/infrastructure/brand-repository";

/** The signed-in user and their brand (null until onboarding is done). */
export async function GET() {
	const user = await getCurrentUser();
	if (!user) {
		return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
	}
	return Response.json({ user, brand: getBrandByUser(user.id) });
}
