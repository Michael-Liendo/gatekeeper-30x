import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Never import this from a client component: it holds secrets.
 */
/** Treats an empty value (e.g. `KEY=` copied from .env.example) as unset. */
const optionalSecret = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const envSchema = z.object({
	TYPESAFE_API_KEY: optionalSecret,
	OPENAI_API_KEY: optionalSecret,
	/** Max time the primary decision provider gets before falling back. */
	DECISION_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
	/** Directory for the SQLite database (users, sessions, brands). Defaults to ./data. */
	DATA_DIR: optionalSecret,
});

export const env = envSchema.parse(process.env);
