import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import type { DecisionQuestion, DecisionRequest } from "@/modules/content-review/domain/decision";
import { getDecisionEngine } from "@/modules/content-review/infrastructure/decision-engine";

const questionSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("yes_no"), instructions: z.string().min(1) }),
	z.object({
		type: z.literal("choice"),
		instructions: z.string().min(1),
		options: z.record(z.string().min(1), z.string()).refine((o) => Object.keys(o).length >= 2, {
			message: "choice needs at least 2 options",
		}),
	}),
	z.object({
		type: z.literal("score"),
		instructions: z.string().min(1),
		levels: z.array(z.object({ label: z.string().min(1), description: z.string() })).min(2),
	}),
]) satisfies z.ZodType<DecisionQuestion>;

const bodySchema = z.object({
	input: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
	questions: z
		.record(z.string().min(1), questionSchema)
		.refine((q) => Object.keys(q).length > 0, { message: "at least one question is required" }),
}) satisfies z.ZodType<DecisionRequest>;

/** Manual testing endpoint: runs the configured decision engine on arbitrary questions. */
export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{ error: "Petición inválida.", issues: z.treeifyError(parsed.error) },
			{ status: 400 },
		);
	}

	const limited = enforceDailyLimit(user, { decisions: 1 });
	if (limited) return limited;

	try {
		const result = await getDecisionEngine().decide(parsed.data);
		return Response.json(result);
	} catch (error) {
		console.warn(
			`[decide] decision failed: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		return Response.json(
			{
				error:
					"El motor de decisiones no está disponible en este momento. El contenido debe pasar a revisión humana.",
			},
			{ status: 503 },
		);
	}
}
