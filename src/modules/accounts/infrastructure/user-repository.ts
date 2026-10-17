import "server-only";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { UserAccount } from "@/modules/brand/domain/brand-profile";
import { getDb } from "@/shared/db/sqlite";

interface UserRow {
	id: string;
	email: string;
	name: string;
	created_at: string;
}

function toUser(row: UserRow): UserAccount {
	return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export interface UserRepository {
	findByEmail(email: string): UserAccount | null;
	findById(id: string): UserAccount | null;
	create(input: { email: string; name: string }): UserAccount;
}

/** Users table access. Emails are stored trimmed and lower-cased. */
export function createUserRepository(db: DatabaseSync): UserRepository {
	const byEmail = db.prepare("SELECT id, email, name, created_at FROM users WHERE email = ?");
	const byId = db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?");
	const insert = db.prepare(
		"INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?) RETURNING id, email, name, created_at",
	);

	return {
		findByEmail(email) {
			const row = byEmail.get(normalizeEmail(email)) as UserRow | undefined;
			return row ? toUser(row) : null;
		},
		findById(id) {
			const row = byId.get(id) as UserRow | undefined;
			return row ? toUser(row) : null;
		},
		create({ email, name }) {
			const row = insert.get(
				randomUUID(),
				normalizeEmail(email),
				name.trim(),
				new Date().toISOString(),
			) as unknown as UserRow;
			return toUser(row);
		},
	};
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

let defaultRepository: UserRepository | undefined;

/** Repository bound to the app database. */
export function userRepository(): UserRepository {
	defaultRepository ??= createUserRepository(getDb());
	return defaultRepository;
}
