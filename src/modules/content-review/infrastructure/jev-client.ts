import "server-only";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { env } from "@/shared/config/env";

let client: TypeSafeClient | undefined;

/**
 * Single JEV client for the module. Every call to TypeSafe goes through
 * this adapter, never directly from a route or a component.
 * Created lazily so builds don't need the API key.
 */
export function getJev(): TypeSafeClient {
	client ??= new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY });
	return client;
}

/** JEV model id. Pinned in code, not configurable per environment. */
export const JEV_MODEL = "jev-latest";

/**
 * Model for requests with a screenshot. The SDK docs only require `jev-preview` for
 * `box` questions, so images use the same pinned model as text.
 */
export const JEV_IMAGE_MODEL = JEV_MODEL;

/** Opt-in header for TypeSafe's experimental image support, sent per request. */
export const JEV_IMAGE_HEADERS: Readonly<Record<string, string>> = {
	"TypeSafe-Danger-Zone-Images": "true",
};
