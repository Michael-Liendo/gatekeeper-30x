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
	 * Public path of a bundled sample image (e.g. "/samples/cp-001.jpg"), only in the
	 * simulated dataset. Generated with gpt-image-2; no real people or third-party media.
	 */
	imagePath?: string;
	/**
	 * Optional screenshot of the piece (post, slide, thumbnail) as a PNG or JPEG
	 * `data:` URL. When present, the decision engine judges the image too.
	 */
	imageDataUrl?: string;
	/**
	 * Expected route, only in simulated data, used to measure precision in the demo.
	 * Not sent to any model.
	 */
	expectedRoute?: "AUTO_APPROVE" | "ENRICH_WITH_LLM" | "HUMAN_REVIEW" | "REJECT";
}
