import "server-only";
import type {
	DecisionEngine,
	DecisionProvider,
	DecisionRequest,
	DecisionResult,
} from "../domain/decision";

class DecisionTimeoutError extends Error {
	constructor(timeoutMs: number) {
		super(`Decision provider timed out after ${timeoutMs} ms`);
		this.name = "DecisionTimeoutError";
	}
}

/** Thrown when neither the primary nor the fallback provider could answer. */
export class DecisionUnavailableError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "DecisionUnavailableError";
	}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new DecisionTimeoutError(timeoutMs)), timeoutMs);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function describeError(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
}

/**
 * Runs the primary engine under a timeout and falls back to a second engine on any
 * error. Never invents answers: if both fail it throws, and callers route the
 * content to human review.
 */
export class FallbackDecisionEngine implements DecisionEngine {
	readonly provider: DecisionProvider;

	constructor(
		private readonly primary: DecisionEngine,
		private readonly fallback: DecisionEngine,
		private readonly timeoutMs: number,
	) {
		this.provider = primary.provider;
	}

	async decide(request: DecisionRequest): Promise<DecisionResult> {
		let primaryError: unknown;
		try {
			return await withTimeout(this.primary.decide(request), this.timeoutMs);
		} catch (error) {
			primaryError = error;
			// Log only the error, never the content under review.
			console.warn(
				`[decision] primary provider "${this.primary.provider}" failed, using "${this.fallback.provider}": ${describeError(error)}`,
			);
		}

		try {
			const result = await this.fallback.decide(request);
			return { ...result, usedFallback: true };
		} catch (fallbackError) {
			throw new DecisionUnavailableError(
				`All decision providers failed (primary: ${describeError(primaryError)}; fallback: ${describeError(fallbackError)})`,
				{ cause: fallbackError },
			);
		}
	}
}
