import "server-only";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { UserAccount } from "@/modules/brand/domain/brand-profile";
import { TEAM_ROLES, type TeamRole } from "@/modules/workspace/domain/workspace";
import { getDb } from "@/shared/db/sqlite";

interface UserRow {
	id: string;
	email: string;
	name: string;
	role: string;
	created_at: string;
}

function toRole(value: string): TeamRole {
	return (TEAM_ROLES as readonly string[]).includes(value) ? (value as TeamRole) : "other";
}

function toUser(row: UserRow): UserAccount {
	return {
		id: row.id,
		email: row.email,
		name: row.name,
		role: toRole(row.role),
		createdAt: row.created_at,
	};
}

export interface UserRepository {
	findByEmail(email: string): UserAccount | null;
	findById(id: string): UserAccount | null;
	create(input: { email: string; name: string }): UserAccount;
	/** Returns the updated user, or null when the id is unknown. */
	updateRole(id: string, role: TeamRole): UserAccount | null;
}

/** Users table access. Emails are stored trimmed and lower-cased. */
export function createUserRepository(db: DatabaseSync): UserRepository {
	const byEmail = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE email = ?");
	const byId = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?");
	const insert = db.prepare(
		"INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?) RETURNING id, email, name, role, created_at",
	);
	const setRole = db.prepare(
		"UPDATE users SET role = ? WHERE id = ? RETURNING id, email, name, role, created_at",
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
		updateRole(id, role) {
			const row = setRole.get(role, id) as UserRow | undefined;
			return row ? toUser(row) : null;
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
