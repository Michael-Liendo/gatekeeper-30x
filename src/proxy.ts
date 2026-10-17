import { type NextRequest, NextResponse } from "next/server";
import { sessionRepository } from "@/modules/accounts/infrastructure/session-repository";
import { getBrandByUser } from "@/modules/brand/infrastructure/brand-repository";

const SESSION_COOKIE = "gk_session";
const SIGN_IN_PATH = "/ingresar";
const ONBOARDING_PATH = "/bienvenida";

function isPublic(pathname: string): boolean {
	return (
		pathname === SIGN_IN_PATH || pathname === "/api/health" || pathname.startsWith("/api/auth/")
	);
}

/** Reachable with a session but before onboarding is done. */
function allowedWithoutBrand(pathname: string): boolean {
	return (
		pathname === ONBOARDING_PATH ||
		pathname.startsWith(`${ONBOARDING_PATH}/`) ||
		pathname === "/api/me" ||
		pathname === "/api/brand" ||
		pathname.startsWith("/api/brand/")
	);
}

function unauthorized(request: NextRequest, clearCookie: boolean): NextResponse {
	const response = request.nextUrl.pathname.startsWith("/api/")
		? NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 })
		: NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
	if (clearCookie) response.cookies.delete(SESSION_COOKIE);
	return response;
}

/**
 * Auth gate (Node.js runtime): no session → /ingresar (401 for APIs);
 * session without brand → /bienvenida.
 */
export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (isPublic(pathname)) return NextResponse.next();

	const token = request.cookies.get(SESSION_COOKIE)?.value;
	if (!token) return unauthorized(request, false);

	const userId = sessionRepository().findUserId(token);
	if (!userId) return unauthorized(request, true);

	if (!pathname.startsWith("/api/") && !allowedWithoutBrand(pathname) && !getBrandByUser(userId)) {
		return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
	}
	return NextResponse.next();
}

export const config = {
	// Skip Next internals and any path with a file extension (static assets).
	matcher: ["/((?!_next/static|_next/image|_next/data|.*\\.[\\w]+$).*)"],
};
