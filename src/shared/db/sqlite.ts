import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "@/shared/config/env";

const DB_FILE = "gatekeeper.db";

/** Idempotent schema. Safe to run on every boot. */
const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE COLLATE NOCASE,
	name TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS brands (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
	data TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pieces (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	brand_id TEXT NOT NULL,
	author_name TEXT NOT NULL,
	author_role TEXT NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	format TEXT NOT NULL,
	channel TEXT NOT NULL,
	image_file TEXT,
	status TEXT NOT NULL,
	review TEXT NOT NULL,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pieces_user_created ON pieces(user_id, created_at);

CREATE TABLE IF NOT EXISTS piece_events (
	id TEXT PRIMARY KEY,
	piece_id TEXT NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	actor_name TEXT NOT NULL,
	summary TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS piece_events_piece ON piece_events(piece_id, created_at);
`;

/** Adds a column unless it already exists (SQLite has no ADD COLUMN IF NOT EXISTS). */
function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string) {
	const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
	if (!columns.some((c) => c.name === column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	}
}

/** Opens (creating if needed) the database in `dir` and applies migrations. */
export function openDatabase(dir: string): DatabaseSync {
	mkdirSync(dir, { recursive: true });
	const db = new DatabaseSync(path.join(dir, DB_FILE));
	db.exec("PRAGMA journal_mode = WAL;");
	db.exec("PRAGMA foreign_keys = ON;");
	db.exec("PRAGMA busy_timeout = 5000;");
	db.exec(MIGRATIONS);
	addColumnIfMissing(db, "users", "role", "TEXT NOT NULL DEFAULT 'other'");
	addColumnIfMissing(db, "pieces", "sample_id", "TEXT");
	// One example piece per sample and user, even if two seeds race.
	db.exec(
		"CREATE UNIQUE INDEX IF NOT EXISTS pieces_user_sample ON pieces(user_id, sample_id) WHERE sample_id IS NOT NULL;",
	);
	return db;
}

// Kept on globalThis so dev hot reloads reuse the same connection.
const globalForDb = globalThis as typeof globalThis & { __gatekeeperDb?: DatabaseSync };

/**
 * Process-wide connection, opened lazily on first use so `next build` never
 * creates the database file.
 */
export function getDb(): DatabaseSync {
	globalForDb.__gatekeeperDb ??= openDatabase(env.DATA_DIR ?? "./data");
	return globalForDb.__gatekeeperDb;
}
