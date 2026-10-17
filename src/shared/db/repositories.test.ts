import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

// Resolve "@/..." to src/, extensionless relative imports to ".ts", and stub
// "server-only" (it only guards against client bundles).
const srcDir = path.resolve(import.meta.dirname, "../..");
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "server-only") {
			return { url: "data:text/javascript,export {};", shortCircuit: true };
		}
		if (specifier.startsWith("@/")) {
			return nextResolve(
				`${pathToFileURL(path.join(srcDir, specifier.slice(2))).href}.ts`,
				context,
			);
		}
		try {
			return nextResolve(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
});

const dir = mkdtempSync(path.join(tmpdir(), "gatekeeper-db-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const { openDatabase } = (await import(
	new URL("./sqlite.ts", import.meta.url).href
)) as typeof import("./sqlite");
const { createUserRepository } = (await import(
	new URL("../../modules/accounts/infrastructure/user-repository.ts", import.meta.url).href
)) as typeof import("../../modules/accounts/infrastructure/user-repository");
const { createSessionRepository, hashSessionToken, SESSION_TTL_MS } = (await import(
	new URL("../../modules/accounts/infrastructure/session-repository.ts", import.meta.url).href
)) as typeof import("../../modules/accounts/infrastructure/session-repository");
const { createBrandRepository } = (await import(
	new URL("../../modules/brand/infrastructure/brand-repository.ts", import.meta.url).href
)) as typeof import("../../modules/brand/infrastructure/brand-repository");

const db = openDatabase(dir);
after(() => db.close());

describe("sqlite repositories", () => {
	it("migrations are idempotent", () => {
		openDatabase(dir).close();
	});

	it("users: unique case-insensitive email", () => {
		const users = createUserRepository(db);
		const created = users.create({ email: " Ana@Example.com ", name: " Ana " });
		assert.equal(created.email, "ana@example.com");
		assert.equal(created.name, "Ana");
		assert.deepEqual(users.findByEmail("ANA@example.com"), created);
		assert.deepEqual(users.findById(created.id), created);
		assert.throws(() => users.create({ email: "ana@EXAMPLE.com", name: "Otra" }));
	});

	it("sessions: stores only the hash and expires after 30 days", () => {
		const user = createUserRepository(db).create({ email: "s@example.com", name: "S" });
		let now = Date.now();
		const sessions = createSessionRepository(db, () => now);
		const { token } = sessions.create(user.id);
		assert.equal(Buffer.from(token, "base64url").length, 32);
		const stored = db.prepare("SELECT token_hash FROM sessions WHERE user_id = ?").get(user.id);
		assert.equal(stored?.token_hash, hashSessionToken(token));
		assert.equal(sessions.findUserId(token), user.id);
		assert.equal(sessions.findUserId("nope"), null);

		now += SESSION_TTL_MS + 1;
		assert.equal(sessions.findUserId(token), null);
		const left = db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(user.id);
		assert.equal(left?.n, 0);
	});

	it("sessions: delete", () => {
		const user = createUserRepository(db).create({ email: "d@example.com", name: "D" });
		const sessions = createSessionRepository(db);
		const { token } = sessions.create(user.id);
		sessions.delete(token);
		assert.equal(sessions.findUserId(token), null);
	});

	it("brands: upsert keeps id and createdAt, updates data", () => {
		const user = createUserRepository(db).create({ email: "b@example.com", name: "B" });
		const brands = createBrandRepository(db);
		assert.equal(brands.getByUser(user.id), null);
		const input = {
			name: "Acme",
			description: "",
			audience: "",
			offerings: [],
			tone: "",
			topics: ["Ventas"],
			forbidden: [],
			colors: ["#111111"],
			links: [],
		};
		const first = brands.upsert(user.id, input);
		const second = brands.upsert(user.id, { ...input, name: "Acme 2" });
		assert.equal(second.id, first.id);
		assert.equal(second.createdAt, first.createdAt);
		assert.equal(second.name, "Acme 2");
		assert.deepEqual(brands.getByUser(user.id), second);
	});
});
