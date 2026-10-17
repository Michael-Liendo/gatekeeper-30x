/** A piece of content produced for 30X Media that needs an editorial decision. */
export type ContentFormat = "post" | "video_script" | "clip" | "newsletter";

export type ContentChannel = "linkedin" | "instagram" | "youtube" | "x" | "newsletter" | "blog";

export interface ContentPiece {
	id: string;
	title: string;
	body: string;
	format: ContentFormat;
	channel: ContentChannel;
	/** Simulated author role, never a real person. */
	author: string;
	createdAt: string;
	/**
	 * Expected route, only in simulated data, used to measure precision in the demo.
	 * Not sent to any model.
	 */
	expectedRoute?: "AUTO_APPROVE" | "ENRICH_WITH_LLM" | "HUMAN_REVIEW" | "REJECT";
}
