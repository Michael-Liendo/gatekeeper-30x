import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Never import this from a client component: it holds secrets.
 */
/** Treats an empty value (e.g. `KEY=` copied from .env.example) as unset. */
const optionalSecret = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

/** A non-negative integer, or undefined when unset or empty. */
const optionalLimit = z.preprocess(
	(v) => (v === "" ? undefined : v),
	z.coerce.number().int().min(0).optional(),
);

const envSchema = z.object({
	TYPESAFE_API_KEY: optionalSecret,
	OPENAI_API_KEY: optionalSecret,
	/** Max time the primary decision provider gets before falling back. */
	DECISION_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
	/** Directory for the SQLite database (users, sessions, brands). Defaults to ./data. */
	DATA_DIR: optionalSecret,
	/**
	 * Optional overrides of the daily usage limits (see accounts/domain/usage-limits.ts).
	 * Unset keeps the default; 0 blocks the bucket.
	 */
	DAILY_LIMIT_DECISIONS_USER: optionalLimit,
	DAILY_LIMIT_DECISIONS_GLOBAL: optionalLimit,
	DAILY_LIMIT_LLM_USER: optionalLimit,
	DAILY_LIMIT_LLM_GLOBAL: optionalLimit,
	DAILY_LIMIT_IMAGES_USER: optionalLimit,
	DAILY_LIMIT_IMAGES_GLOBAL: optionalLimit,
});

export const env = envSchema.parse(process.env);
