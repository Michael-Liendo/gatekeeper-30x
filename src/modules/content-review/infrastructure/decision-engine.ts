import "server-only";
import { env } from "@/shared/config/env";
import type { DecisionEngine } from "../domain/decision";
import { FallbackDecisionEngine } from "./fallback-decision-engine";
import { JevDecisionEngine } from "./jev-decision-engine";
import { OpenAIDecisionEngine } from "./openai-decision-engine";

/** Thrown when no decision provider has an API key configured. */
export class DecisionEngineNotConfiguredError extends Error {
	constructor() {
		super("No decision provider configured: set TYPESAFE_API_KEY and/or OPENAI_API_KEY");
		this.name = "DecisionEngineNotConfiguredError";
	}
}

let engine: DecisionEngine | undefined;

/**
 * JEV as primary with OpenAI Decisions as fallback when both keys exist;
 * otherwise whichever provider is configured.
 */
export function getDecisionEngine(): DecisionEngine {
	if (engine) return engine;

	const hasJev = Boolean(env.TYPESAFE_API_KEY);
	const hasOpenAI = Boolean(env.OPENAI_API_KEY);

	if (hasJev && hasOpenAI) {
		engine = new FallbackDecisionEngine(
			new JevDecisionEngine(),
			new OpenAIDecisionEngine(),
			env.DECISION_TIMEOUT_MS,
		);
	} else if (hasJev) {
		engine = new JevDecisionEngine();
	} else if (hasOpenAI) {
		engine = new OpenAIDecisionEngine();
	} else {
		throw new DecisionEngineNotConfiguredError();
	}
	return engine;
}
