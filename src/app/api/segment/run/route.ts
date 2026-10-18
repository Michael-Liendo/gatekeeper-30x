import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import { segmentBatch } from "@/modules/segmentation/application/segment-batch";
import {
	DEFAULT_BATCH_SIZE,
	segmentRunSchema,
} from "@/modules/segmentation/application/segment-schemas";
import { getSegmentDeps } from "@/modules/segmentation/infrastructure/segment-deps";

/**
 * Segments a reproducible stratified sample of 30X's sign-up profiles (50, 100 or 200)
 * and measures the result against 30X's own "Programa sugerido".
 */
export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) {
		return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
	}

	let json: unknown = {};
	const text = await request.text();
	if (text.trim()) {
		try {
			json = JSON.parse(text);
		} catch {
			return Response.json(
				{ error: "El cuerpo de la petición no es JSON válido." },
				{ status: 400 },
			);
		}
	}

	const parsed = segmentRunSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{ error: "Petición inválida.", issues: z.treeifyError(parsed.error) },
			{ status: 400 },
		);
	}

	let deps: ReturnType<typeof getSegmentDeps>;
	try {
		deps = getSegmentDeps();
	} catch (error) {
		console.error(
			`[segment] dataset unavailable: ${error instanceof Error ? error.message : error}`,
		);
		return Response.json(
			{ error: "No encontramos los perfiles de ejemplo de 30X." },
			{ status: 500 },
		);
	}

	const size = parsed.data.size ?? DEFAULT_BATCH_SIZE;
	const limited = enforceDailyLimit(user, { decisions: size });
	if (limited) return limited;

	return Response.json(await segmentBatch({ size }, deps));
}
