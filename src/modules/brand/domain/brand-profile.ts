/**
 * The brand whose content the gatekeeper reviews. Filled during onboarding
 * (manually or pre-filled by scraping the brand's website) and fed to the
 * decision engine so editorial questions are judged against THIS brand.
 */
export interface BrandProfile {
	id: string;
	name: string;
	/** One or two sentences: what the brand is. */
	description: string;
	/** Who the content is for, e.g. "Fundadores y ejecutivos de Latinoamérica". */
	audience: string;
	/** Products/services the brand actually sells. Content offering anything else is flagged. */
	offerings: string[];
	/** Voice and tone guidelines, e.g. "Directo, sin promesas exageradas". */
	tone: string;
	/** Topics the brand covers (used as choice options for the topic question). */
	topics: string[];
	/** Topics or claims the brand never publishes. */
	forbidden: string[];
	/** Brand colors as hex strings (#RRGGBB); the first is the primary. */
	colors: string[];
	/** Public website(s) used to pre-fill the profile. */
	links: string[];
	/** Optional logo URL found while scraping. */
	logoUrl?: string;
	createdAt: string;
	updatedAt: string;
}

/** Fields the user edits in onboarding / brand settings. */
export type BrandProfileInput = Omit<BrandProfile, "id" | "createdAt" | "updatedAt">;

/** Draft returned by the website extractor; every field optional, user confirms. */
export type BrandProfileDraft = Partial<BrandProfileInput> & {
	/** Spanish notes about what could not be extracted. */
	warnings?: string[];
};

/** The account that owns a brand. Email-only sign-in (hackathon demo, no password). */
export interface UserAccount {
	id: string;
	email: string;
	name: string;
	createdAt: string;
}
