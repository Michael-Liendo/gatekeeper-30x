import "server-only";
import {
	type ConsumeDecision,
	secondsUntilNextUsageDay,
	type UsageAmounts,
	type UsageBucket,
} from "@/modules/accounts/domain/usage-limits";
import { usageRepository } from "./usage-repository";

/** What each bucket is called in the user's own limit message. */
const BUCKET_LABELS: Record<UsageBucket, string> = {
	decisions: "decisiones",
	llm: "sugerencias con IA",
	images: "imágenes generadas",
};

export const GLOBAL_LIMIT_MESSAGE = "La demo alcanzó su límite diario de uso. Vuelve mañana.";

export function dailyLimitMessage(decision: Extract<ConsumeDecision, { ok: false }>): string {
	return decision.scope === "global"
		? GLOBAL_LIMIT_MESSAGE
		: `Llegaste al límite diario de ${BUCKET_LABELS[decision.bucket]}. Se reinicia mañana.`;
}

/** Reserves today's usage for the user; returns whether it fit. Nothing is refunded. */
export function consumeDailyUsage(userId: string, amounts: UsageAmounts): ConsumeDecision {
	return usageRepository().tryConsume(userId, amounts);
}

/**
 * Reserves the provider calls a request is about to make. Returns a 429 response when
 * the user's or the global daily limit would be exceeded, or null to go ahead.
 * Call it right before the provider work, after validating the request.
 */
export function enforceDailyLimit(user: { id: string }, amounts: UsageAmounts): Response | null {
	const decision = consumeDailyUsage(user.id, amounts);
	if (decision.ok) return null;
	return Response.json(
		{ error: dailyLimitMessage(decision), limit: decision.limit, remaining: decision.remaining },
		{
			status: 429,
			headers: { "Retry-After": String(secondsUntilNextUsageDay(new Date())) },
		},
	);
}
