import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { usageRepository } from "@/modules/accounts/infrastructure/usage-repository";

/** Today's (UTC) provider usage and daily limits, for the user and for everyone. */
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
	return Response.json(usageRepository().snapshot(user.id));
}
