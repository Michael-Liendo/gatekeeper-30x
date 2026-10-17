import { z } from "zod";
import { createSession } from "@/modules/accounts/infrastructure/session";
import { userRepository } from "@/modules/accounts/infrastructure/user-repository";

const signInSchema = z.object({
	email: z.email("Escribe un correo válido.").trim().max(254),
	name: z
		.string()
		.trim()
		.max(80, "El nombre admite hasta 80 caracteres.")
		.optional()
		.transform((v) => v || undefined),
});

/** Email-only sign-in: creates the user on first visit (name required then). */
export async function POST(request: Request) {
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = signInSchema.safeParse(json);
	if (!parsed.success) {
		const message = parsed.error.issues[0]?.message ?? "Petición inválida.";
		return Response.json({ error: message }, { status: 400 });
	}

	const { email, name } = parsed.data;
	const users = userRepository();
	let user = users.findByEmail(email);
	const isNew = !user;
	if (!user) {
		if (!name) {
			return Response.json(
				{ error: "Escribe tu nombre para crear tu cuenta", needsName: true },
				{ status: 400 },
			);
		}
		user = users.create({ email, name });
	}

	await createSession(user.id);
	return Response.json({ user, isNew });
}
