import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Never import this from a client component: it holds secrets.
 */
const envSchema = z.object({
	TYPESAFE_API_KEY: z.string().min(1).optional(),
	TYPESAFE_MODEL: z.string().default("jev-latest"),
});

export const env = envSchema.parse(process.env);
