import "server-only";
import { createHash } from "node:crypto";
import type { ReviewResult } from "@/modules/content-review/domain/review";

/** How long a regenerated proposal's review can be reused when it is saved. */
const TTL_MS = 30 * 60 * 1000;

interface Entry {
	fingerprint: string;
	review: ReviewResult;
	expiresAt: number;
}

/** In-memory: one app container, and losing it only costs one extra JEV review. */
const entries = new Map<string, Entry>();

function key(userId: string, pieceId: string): string {
	return `${userId}:${pieceId}`;
}

function fingerprint(title: string, body: string, imageDataUrl?: string): string {
	return createHash("sha256")
		.update(title.trim())
		.update("\0")
		.update(body.trim())
		.update("\0")
		.update(imageDataUrl ?? "")
		.digest("hex");
}

/** Remembers the review JEV gave to a regenerated proposal of one of the user's pieces. */
export function rememberProposalReview(
	userId: string,
	pieceId: string,
	proposal: { title: string; body: string; imageDataUrl?: string },
	review: ReviewResult,
): void {
	const now = Date.now();
	for (const [k, entry] of entries) if (entry.expiresAt <= now) entries.delete(k);
	entries.set(key(userId, pieceId), {
		fingerprint: fingerprint(proposal.title, proposal.body, proposal.imageDataUrl),
		review,
		expiresAt: now + TTL_MS,
	});
}

/**
 * The review of the exact proposal being saved, if JEV already judged it. Single use:
 * saving the same content again, or anything edited, gets a fresh review.
 */
export function takeProposalReview(
	userId: string,
	pieceId: string,
	content: { title: string; body: string; imageDataUrl?: string },
): ReviewResult | undefined {
	const k = key(userId, pieceId);
	const entry = entries.get(k);
	if (!entry) return undefined;
	entries.delete(k);
	if (entry.expiresAt <= Date.now()) return undefined;
	const match =
		entry.fingerprint === fingerprint(content.title, content.body, content.imageDataUrl);
	return match ? entry.review : undefined;
}
