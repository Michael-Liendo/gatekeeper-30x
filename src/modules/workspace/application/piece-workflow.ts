// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile, UserAccount } from "../../brand/domain/brand-profile";
import { reviewPiece } from "../../content-review/application/review-piece";
import { MISSING_CONTENT_MESSAGE } from "../../content-review/application/review-schemas";
import { parseImageDataUrl, toImageDataUrl } from "../../content-review/domain/content-image";
import type { ContentPiece } from "../../content-review/domain/content-piece";
import type { DecisionImage } from "../../content-review/domain/decision";
import type { ReviewResult } from "../../content-review/domain/review";
import {
	REVIEWER_NAME,
	reviewSummary,
	SUBMITTED_SUMMARY,
	statusChangeSummary,
	versionSummary,
} from "../domain/piece-timeline";
import {
	type PieceEvent,
	type PieceEventType,
	type PieceStatus,
	pieceImageUrl,
	STATUS_FROM_ROUTE,
	type WorkspacePiece,
} from "../domain/workspace";
import type { StoredImage, StoredPiece, WorkspaceDeps } from "./workspace-ports";
import type { ChangeStatusInput, NewVersionInput, SubmitPieceInput } from "./workspace-schemas";

/** The signed-in person acting on their pieces. */
export type Actor = Pick<UserAccount, "id" | "name" | "role">;

/** Thrown when the piece does not exist or belongs to someone else (both → 404). */
export class PieceNotFoundError extends Error {
	constructor() {
		super("No encontramos esa pieza.");
		this.name = "PieceNotFoundError";
	}
}

/** Thrown when a new version would leave the piece with no text and no screenshot (→ 400). */
export class EmptyPieceError extends Error {
	constructor() {
		super(MISSING_CONTENT_MESSAGE);
		this.name = "EmptyPieceError";
	}
}

/** The stored piece if `actor` owns it; otherwise PieceNotFoundError. */
function ownedPiece(pieceId: string, actor: Actor, deps: WorkspaceDeps): StoredPiece {
	const stored = deps.pieces.findById(pieceId);
	if (!stored || stored.piece.authorId !== actor.id) throw new PieceNotFoundError();
	return stored;
}

function decodeImage(dataUrl: string | undefined): DecisionImage | null {
	return dataUrl ? parseImageDataUrl(dataUrl) : null;
}

/** The current screenshot as a `data:` URL so the reviewer judges it again. */
function storedImageDataUrl(fileName: string | null, deps: WorkspaceDeps): string | undefined {
	const stored = fileName ? deps.images.read(fileName) : null;
	if (!stored) return undefined;
	return toImageDataUrl({
		mimeType: stored.mimeType,
		base64: Buffer.from(stored.bytes).toString("base64"),
	});
}

/** The review without the screenshot: the image lives on disk, not in the JSON. */
function withoutImage(review: ReviewResult): ReviewResult {
	const { imageDataUrl: _image, ...piece } = review.piece;
	return { ...review, piece };
}

async function runReview(
	content: ContentPiece,
	brand: BrandProfile,
	deps: WorkspaceDeps,
): Promise<ReviewResult> {
	return withoutImage(await reviewPiece(content, { brand, enrich: false }, deps.review));
}

function addEvent(
	deps: WorkspaceDeps,
	pieceId: string,
	type: PieceEventType,
	actorName: string,
	summary: string,
	at: Date,
): void {
	const event: PieceEvent = {
		id: deps.newId(),
		pieceId,
		type,
		actorName,
		summary,
		createdAt: at.toISOString(),
	};
	deps.events.add(event);
}

/**
 * Stores a new piece for `actor`: saves the screenshot (if any), reviews it with JEV
 * against the actor's brand, sets the status from the route and records the
 * "submitted" and "reviewed" events.
 */
export async function submitPiece(
	input: SubmitPieceInput,
	actor: Actor,
	brand: BrandProfile,
	deps: WorkspaceDeps,
): Promise<WorkspacePiece> {
	const id = deps.newId();
	const createdAt = deps.now();
	const image = decodeImage(input.imageDataUrl);
	const imageFile = image ? deps.images.save(id, 1, image) : null;

	const content: ContentPiece = {
		id,
		title: input.title,
		body: input.body,
		format: input.format,
		channel: input.channel,
		author: actor.name,
		createdAt: createdAt.toISOString(),
		...(image ? { imageDataUrl: toImageDataUrl(image) } : {}),
	};
	const review = await runReview(content, brand, deps);
	const reviewedAt = deps.now();

	const piece: WorkspacePiece = {
		id,
		brandId: brand.id,
		authorId: actor.id,
		authorName: actor.name,
		authorRole: actor.role,
		title: input.title,
		body: input.body,
		format: input.format,
		channel: input.channel,
		...(imageFile ? { imageUrl: pieceImageUrl(id) } : {}),
		status: STATUS_FROM_ROUTE[review.route],
		review,
		version: 1,
		createdAt: createdAt.toISOString(),
		updatedAt: reviewedAt.toISOString(),
	};
	deps.pieces.insert({ piece, imageFile });
	addEvent(deps, id, "submitted", actor.name, SUBMITTED_SUMMARY, createdAt);
	addEvent(deps, id, "reviewed", REVIEWER_NAME, reviewSummary(review), reviewedAt);
	return piece;
}

/** The actor's pieces, newest first. */
export function listPieces(actor: Actor, status: PieceStatus | undefined, deps: WorkspaceDeps) {
	return deps.pieces.listByAuthor(actor.id, status);
}

/** One of the actor's pieces with its timeline. */
export function getPieceDetail(
	pieceId: string,
	actor: Actor,
	deps: WorkspaceDeps,
): { piece: WorkspacePiece; events: PieceEvent[] } {
	const { piece } = ownedPiece(pieceId, actor, deps);
	return { piece, events: deps.events.listByPiece(pieceId) };
}

/** Moves the piece to any column and records who did it. */
export function changePieceStatus(
	pieceId: string,
	input: ChangeStatusInput,
	actor: Actor,
	deps: WorkspaceDeps,
): WorkspacePiece {
	const stored = ownedPiece(pieceId, actor, deps);
	const at = deps.now();
	const piece: WorkspacePiece = {
		...stored.piece,
		status: input.status,
		updatedAt: at.toISOString(),
	};
	deps.pieces.update({ ...stored, piece });
	addEvent(
		deps,
		pieceId,
		"status_changed",
		actor.name,
		statusChangeSummary(input.status, input.note),
		at,
	);
	return piece;
}

/**
 * Saves new content as the next version, re-reviews it with JEV (same brand) and sets
 * the status from the new route. A new screenshot replaces the old one; without it the
 * previous screenshot is kept and judged again.
 */
export async function saveNewVersion(
	pieceId: string,
	input: NewVersionInput,
	actor: Actor,
	brand: BrandProfile,
	deps: WorkspaceDeps,
): Promise<WorkspacePiece> {
	const stored = ownedPiece(pieceId, actor, deps);
	const newImage = decodeImage(input.imageDataUrl);
	if (!input.body && !newImage && !stored.imageFile) throw new EmptyPieceError();

	const version = stored.piece.version + 1;
	const savedAt = deps.now();
	const imageFile = newImage ? deps.images.save(pieceId, version, newImage) : stored.imageFile;
	const imageDataUrl = newImage
		? toImageDataUrl(newImage)
		: storedImageDataUrl(stored.imageFile, deps);

	const content: ContentPiece = {
		id: pieceId,
		title: input.title,
		body: input.body,
		format: stored.piece.format,
		channel: stored.piece.channel,
		author: stored.piece.authorName,
		createdAt: stored.piece.createdAt,
		...(imageDataUrl ? { imageDataUrl } : {}),
	};
	const review = await runReview(content, brand, deps);
	const reviewedAt = deps.now();

	const { imageUrl: _old, ...rest } = stored.piece;
	const piece: WorkspacePiece = {
		...rest,
		...(imageFile ? { imageUrl: pieceImageUrl(pieceId) } : {}),
		title: input.title,
		body: input.body,
		status: STATUS_FROM_ROUTE[review.route],
		review,
		version,
		updatedAt: reviewedAt.toISOString(),
	};
	deps.pieces.update({ piece, imageFile });
	addEvent(
		deps,
		pieceId,
		"version_saved",
		actor.name,
		versionSummary(version, input.changes),
		savedAt,
	);
	addEvent(deps, pieceId, "reviewed", REVIEWER_NAME, reviewSummary(review), reviewedAt);
	return piece;
}

/** The current screenshot of one of the actor's pieces, or null when it has none. */
export function getPieceImage(
	pieceId: string,
	actor: Actor,
	deps: WorkspaceDeps,
): StoredImage | null {
	const { imageFile } = ownedPiece(pieceId, actor, deps);
	return imageFile ? deps.images.read(imageFile) : null;
}
