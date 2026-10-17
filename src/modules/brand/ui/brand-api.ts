import { fetchJson } from "@/shared/ui/fetch-json";
import type { BrandProfile, BrandProfileDraft, BrandProfileInput } from "../domain/brand-profile";

/** Client calls for the brand API (see docs/06-contrato-marca.md). */

/** Scrapes the brand's links and returns a pre-filled draft. */
export function extractBrand(urls: string[]): Promise<BrandProfileDraft> {
	// The route accepts `{ url }` or `{ urls }`; send only `urls` so every link is read.
	return fetchJson<BrandProfileDraft>("/api/brand/extract", { body: { urls } });
}

export function saveBrand(input: BrandProfileInput): Promise<BrandProfile> {
	return fetchJson<BrandProfile>("/api/brand", { method: "PUT", body: input });
}
