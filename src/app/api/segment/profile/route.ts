import { z } from "zod";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { resegment, segmentProfile } from "@/modules/segmentation/application/segment-profile";
import {
	segmentProfileRequestSchema,
	toLeadProfile,
} from "@/modules/segmentation/application/segment-schemas";
import { getSegmentEngineDeps } from "@/modules/segmentation/infrastructure/segment-deps";

/**
 * Segments one live sign-up ("Nuevo inscrito"). With `cambios`, recalculates after the
 * person's situation changed and returns the previous and the new segment.
 */
export async function POST(request: Request) {
	if (!(await getCurrentUser())) {
		return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
	}

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = segmentProfileRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: parsed.error.issues[0]?.message ?? "Petición inválida.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const { cambios, ...fields } = parsed.data;
	const profile = toLeadProfile(fields);
	const deps = getSegmentEngineDeps();

	if (!cambios) {
		return Response.json({ profile, result: await segmentProfile(profile, deps) });
	}
	// Re-estimate "Nivel de info" from the updated fields.
	const updated = toLeadProfile({ ...fields, ...cambios });
	return Response.json(await resegment(profile, updated, deps));
}
