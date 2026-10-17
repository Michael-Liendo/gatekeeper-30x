import "server-only";
import { getCurrentUser } from "@/modules/accounts/infrastructure/session";
import type { BrandProfile } from "@/modules/brand/domain/brand-profile";
import { defaultBrand } from "@/modules/brand/domain/default-brand";
import { getBrandByUser } from "./brand-repository";

export { defaultBrand };

/** Brand of the signed-in user; null without a session or before onboarding. */
export async function getCurrentBrand(): Promise<BrandProfile | null> {
	const user = await getCurrentUser();
	return user ? getBrandByUser(user.id) : null;
}

/** 30X's profile: used for the simulated dataset and for sessions without a brand. */
export function getDefaultBrand(): BrandProfile {
	return defaultBrand;
}
