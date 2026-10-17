// Relative imports (not "@/") so `node --test` can load the use cases without a bundler.
import type { ReviewDeps } from "../../content-review/application/review-piece";
import type { DecisionImage } from "../../content-review/domain/decision";
import type { PieceEvent, PieceStatus, WorkspacePiece } from "../domain/workspace";

/** A piece as stored: the public shape plus the file name of its current screenshot. */
export interface StoredPiece {
	piece: WorkspacePiece;
	/** File name under the uploads directory, or null for text-only pieces. */
	imageFile: string | null;
}

export interface PieceRepository {
	insert(stored: StoredPiece): void;
	/** Replaces the mutable fields (status, content, review, version, image, updatedAt). */
	update(stored: StoredPiece): void;
	findById(id: string): StoredPiece | null;
	/** The author's pieces, newest first, optionally filtered by status. */
	listByAuthor(authorId: string, status?: PieceStatus): WorkspacePiece[];
}

export interface PieceEventRepository {
	add(event: PieceEvent): void;
	/** Oldest first (timeline order). */
	listByPiece(pieceId: string): PieceEvent[];
}

export interface StoredImage {
	mimeType: DecisionImage["mimeType"];
	bytes: Uint8Array;
}

export interface ImageStore {
	/** Saves `<pieceId>-v<version>.<png|jpg>` and returns that file name. */
	save(pieceId: string, version: number, image: DecisionImage): string;
	read(fileName: string): StoredImage | null;
}

/** Everything the workspace use cases need. Infrastructure wires the real ones. */
export interface WorkspaceDeps {
	pieces: PieceRepository;
	events: PieceEventRepository;
	images: ImageStore;
	review: ReviewDeps;
	newId(): string;
	now(): Date;
}
