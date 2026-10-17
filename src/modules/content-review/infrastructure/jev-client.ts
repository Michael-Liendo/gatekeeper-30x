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

export const JEV_MODEL = env.TYPESAFE_MODEL;
