import "server-only";
import { cookies } from "next/headers";
import type { UserAccount } from "@/modules/brand/domain/brand-profile";
import { SESSION_TTL_MS, sessionRepository } from "./session-repository";
import { userRepository } from "./user-repository";

export const SESSION_COOKIE = "gk_session";

/** Thrown by `requireUser()` when the request has no valid session. */
export class UnauthorizedError extends Error {
	constructor(message = "Inicia sesión para continuar.") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

/** The signed-in user, or null when there is no valid session cookie. */
export async function getCurrentUser(): Promise<UserAccount | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const userId = sessionRepository().findUserId(token);
	return userId ? userRepository().findById(userId) : null;
}

export async function requireUser(): Promise<UserAccount> {
	const user = await getCurrentUser();
	if (!user) throw new UnauthorizedError();
	return user;
}

/** Starts a session and sets the cookie. Route Handlers / Server Functions only. */
export async function createSession(userId: string): Promise<void> {
	const { token } = sessionRepository().create(userId);
	(await cookies()).set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: Math.floor(SESSION_TTL_MS / 1000),
	});
}

/** Ends the current session (if any) and clears the cookie. */
export async function destroySession(): Promise<void> {
	const store = await cookies();
	const token = store.get(SESSION_COOKIE)?.value;
	if (token) sessionRepository().delete(token);
	store.delete(SESSION_COOKIE);
}
