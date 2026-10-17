import "server-only";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import type { BrandProfile, UserAccount } from "@/modules/brand/domain/brand-profile";
import { getBrandByUser } from "@/modules/brand/infrastructure/brand-repository";
import { getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import {
	EmptyPieceError,
	PieceNotFoundError,
} from "@/modules/workspace/application/piece-workflow";

/** Shared plumbing for the /api/pieces route handlers. */

export function unauthorized(): Response {
	return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
}

export function badRequest(error: string): Response {
	return Response.json({ error }, { status: 400 });
}

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJson(request: Request): Promise<JsonBody> {
	try {
		return { ok: true, value: await request.json() };
	} catch {
		return { ok: false, response: badRequest("El cuerpo de la petición no es JSON válido.") };
	}
}

/** The signed-in user, or null. */
export function currentUser(): Promise<UserAccount | null> {
	return getCurrentUser();
}

/** The user's brand, or 30X's when onboarding is not done yet. */
export function brandFor(user: UserAccount): BrandProfile {
	return getBrandByUser(user.id) ?? getDefaultBrand();
}

/** Maps the workspace use case errors to 404/400; rethrows anything else. */
export function workflowErrorResponse(error: unknown): Response {
	if (error instanceof PieceNotFoundError) {
		return Response.json({ error: error.message }, { status: 404 });
	}
	if (error instanceof EmptyPieceError) return badRequest(error.message);
	throw error;
}
