import { destroySession } from "@/modules/accounts/infrastructure/session";

export async function POST() {
	await destroySession();
	return Response.json({ ok: true });
}
