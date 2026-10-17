import "server-only";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { BrandProfile, BrandProfileInput } from "@/modules/brand/domain/brand-profile";
import { getDb } from "@/shared/db/sqlite";

interface BrandRow {
	id: string;
	data: string;
	created_at: string;
	updated_at: string;
}

function toBrand(row: BrandRow): BrandProfile {
	const data = JSON.parse(row.data) as BrandProfileInput;
	return { ...data, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
}

export interface BrandRepository {
	getByUser(userId: string): BrandProfile | null;
	upsert(userId: string, input: BrandProfileInput): BrandProfile;
}

/** One brand per user; the editable fields live as JSON in `data`. */
export function createBrandRepository(db: DatabaseSync): BrandRepository {
	const byUser = db.prepare(
		"SELECT id, data, created_at, updated_at FROM brands WHERE user_id = ?",
	);
	const upsert = db.prepare(`
		INSERT INTO brands (id, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
		RETURNING id, data, created_at, updated_at
	`);

	return {
		getByUser(userId) {
			const row = byUser.get(userId) as BrandRow | undefined;
			return row ? toBrand(row) : null;
		},
		upsert(userId, input) {
			const now = new Date().toISOString();
			const row = upsert.get(
				randomUUID(),
				userId,
				JSON.stringify(input),
				now,
				now,
			) as unknown as BrandRow;
			return toBrand(row);
		},
	};
}

let defaultRepository: BrandRepository | undefined;

function brandRepository(): BrandRepository {
	defaultRepository ??= createBrandRepository(getDb());
	return defaultRepository;
}

export function getBrandByUser(userId: string): BrandProfile | null {
	return brandRepository().getByUser(userId);
}

export function upsertBrand(userId: string, input: BrandProfileInput): BrandProfile {
	return brandRepository().upsert(userId, input);
}
