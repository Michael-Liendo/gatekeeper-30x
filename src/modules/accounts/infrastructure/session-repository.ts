import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/shared/db/sqlite";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface NewSession {
	/** Raw token for the cookie. Never stored; only its hash is. */
	token: string;
	expiresAt: Date;
}

export interface SessionRepository {
	create(userId: string): NewSession;
	/** Returns the session's user id, or null when unknown or expired. */
	findUserId(token: string): string | null;
	delete(token: string): void;
}

export function hashSessionToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/** Sessions table access. `now` is injectable for tests. */
export function createSessionRepository(
	db: DatabaseSync,
	now: () => number = Date.now,
): SessionRepository {
	const insert = db.prepare(
		"INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
	);
	const deleteExpired = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
	const select = db.prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?");
	const remove = db.prepare("DELETE FROM sessions WHERE token_hash = ?");

	return {
		create(userId) {
			const token = randomBytes(32).toString("base64url");
			const createdAt = now();
			const expiresAt = createdAt + SESSION_TTL_MS;
			insert.run(hashSessionToken(token), userId, expiresAt, new Date(createdAt).toISOString());
			return { token, expiresAt: new Date(expiresAt) };
		},
		findUserId(token) {
			const at = now();
			deleteExpired.run(at);
			const row = select.get(hashSessionToken(token), at) as { user_id: string } | undefined;
			return row?.user_id ?? null;
		},
		delete(token) {
			remove.run(hashSessionToken(token));
		},
	};
}

let defaultRepository: SessionRepository | undefined;

/** Repository bound to the app database. */
export function sessionRepository(): SessionRepository {
	defaultRepository ??= createSessionRepository(getDb());
	return defaultRepository;
}
