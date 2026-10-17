import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/modules/accounts/infrastructure/session";
import { getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import { runStress } from "@/modules/content-review/application/stress-run";
import {
	DecisionEngineNotConfiguredError,
	getDecisionEngine,
} from "@/modules/content-review/infrastructure/decision-engine";
import { sampleContent } from "@/modules/content-review/infrastructure/sample-content";

/** The run stops launching work at 55 s; this leaves room for in-flight decisions. */
export const maxDuration = 120;

const COOLDOWN_MS = 60_000;
const COOLDOWN_MESSAGE = "Espera un minuto antes de volver a correr la prueba.";
const NOT_CONFIGURED = "El motor de decisiones no está configurado.";

const stressRequestSchema = z
	.object({ count: z.union([z.literal(100), z.literal(1000)]).default(1000) })
	.default({ count: 1000 });

/** Last run start per user id. In memory: one instance is enough for the demo. */
const lastRunAt = new Map<string, number>();

/**
 * "Prueba de escala": 100 or 1.000 real, uncached, text-only decisions with the 30X brand
 * and the default policy. Goes straight to the engine (no decision cache, no LLM).
 */
export async function POST(request: Request) {
	let userId: string;
	try {
		userId = (await requireUser()).id;
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return Response.json({ error: error.message }, { status: 401 });
		}
		throw error;
	}

	const text = await request.text();
	let json: unknown;
	try {
		json = text.trim() === "" ? undefined : JSON.parse(text);
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}
	const parsed = stressRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{ error: "Petición inválida: count debe ser 100 o 1000." },
			{ status: 400 },
		);
	}

	const startedAt = Date.now();
	const last = lastRunAt.get(userId);
	if (last !== undefined && startedAt - last < COOLDOWN_MS) {
		const retryAfter = Math.ceil((COOLDOWN_MS - (startedAt - last)) / 1000);
		return Response.json(
			{ error: COOLDOWN_MESSAGE, retryAfterSeconds: retryAfter },
			{ status: 429, headers: { "Retry-After": String(retryAfter) } },
		);
	}

	let engine: ReturnType<typeof getDecisionEngine>;
	try {
		engine = getDecisionEngine();
	} catch (error) {
		if (error instanceof DecisionEngineNotConfiguredError) {
			return Response.json({ error: NOT_CONFIGURED }, { status: 503 });
		}
		throw error;
	}

	lastRunAt.set(userId, startedAt);
	const report = await runStress(
		{ count: parsed.data.count, brand: getDefaultBrand() },
		{ content: sampleContent, decide: (r) => engine.decide(r) },
	);
	return Response.json(report);
}
