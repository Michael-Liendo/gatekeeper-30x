import type { BrandProfile, UserAccount } from "@/modules/brand/domain/brand-profile";
import { fetchJson } from "@/shared/ui/fetch-json";

/** Client calls for the accounts API (see docs/06-contrato-marca.md). */

export interface SignInResponse {
	user: UserAccount;
	isNew: boolean;
}

export interface MeResponse {
	user: UserAccount;
	brand: BrandProfile | null;
}

export function signIn(input: { email: string; name?: string }): Promise<SignInResponse> {
	return fetchJson<SignInResponse>("/api/auth/sign-in", { body: input });
}

export function signOut(): Promise<{ ok: true }> {
	return fetchJson<{ ok: true }>("/api/auth/sign-out", { method: "POST" });
}

export function fetchMe(signal?: AbortSignal): Promise<MeResponse> {
	return fetchJson<MeResponse>("/api/me", { signal });
}

/** True when a 400 from sign-in asks for the person's name (first sign-in). */
export function needsName(body: unknown): boolean {
	return (
		typeof body === "object" &&
		body !== null &&
		"needsName" in body &&
		(body as { needsName: unknown }).needsName === true
	);
}
