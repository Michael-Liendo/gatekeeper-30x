import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { ContentChannel, ContentFormat } from "@/modules/content-review/domain/content-piece";
import type { ReviewResult } from "@/modules/content-review/domain/review";
import type { PieceRepository, StoredPiece } from "@/modules/workspace/application/workspace-ports";
import {
	type PieceStatus,
	pieceImageUrl,
	type TeamRole,
	type WorkspacePiece,
} from "@/modules/workspace/domain/workspace";
import { getDb } from "@/shared/db/sqlite";

interface PieceRow {
	id: string;
	user_id: string;
	brand_id: string;
	author_name: string;
	author_role: string;
	title: string;
	body: string;
	format: string;
	channel: string;
	image_file: string | null;
	status: string;
	review: string;
	version: number;
	created_at: string;
	updated_at: string;
}

const COLUMNS =
	"id, user_id, brand_id, author_name, author_role, title, body, format, channel, image_file, status, review, version, created_at, updated_at";

function toPiece(row: PieceRow): WorkspacePiece {
	return {
		id: row.id,
		brandId: row.brand_id,
		authorId: row.user_id,
		authorName: row.author_name,
		authorRole: row.author_role as TeamRole,
		title: row.title,
		body: row.body,
		format: row.format as ContentFormat,
		channel: row.channel as ContentChannel,
		...(row.image_file ? { imageUrl: pieceImageUrl(row.id) } : {}),
		status: row.status as PieceStatus,
		review: JSON.parse(row.review) as ReviewResult,
		version: Number(row.version),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/** One row per piece (its current version); the review is stored as JSON. */
export function createPieceRepository(db: DatabaseSync): PieceRepository {
	const insert = db.prepare(
		`INSERT INTO pieces (${COLUMNS}) VALUES (${COLUMNS.replace(/\w+/g, "?")})`,
	);
	const update = db.prepare(`
		UPDATE pieces SET title = ?, body = ?, image_file = ?, status = ?, review = ?, version = ?, updated_at = ?
		WHERE id = ?
	`);
	const byId = db.prepare(`SELECT ${COLUMNS} FROM pieces WHERE id = ?`);
	const byAuthor = db.prepare(
		`SELECT ${COLUMNS} FROM pieces WHERE user_id = ? ORDER BY created_at DESC, rowid DESC`,
	);
	const byAuthorAndStatus = db.prepare(
		`SELECT ${COLUMNS} FROM pieces WHERE user_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC`,
	);

	return {
		insert({ piece, imageFile }) {
			insert.run(
				piece.id,
				piece.authorId,
				piece.brandId,
				piece.authorName,
				piece.authorRole,
				piece.title,
				piece.body,
				piece.format,
				piece.channel,
				imageFile,
				piece.status,
				JSON.stringify(piece.review),
				piece.version,
				piece.createdAt,
				piece.updatedAt,
			);
		},
		update({ piece, imageFile }) {
			update.run(
				piece.title,
				piece.body,
				imageFile,
				piece.status,
				JSON.stringify(piece.review),
				piece.version,
				piece.updatedAt,
				piece.id,
			);
		},
		findById(id): StoredPiece | null {
			const row = byId.get(id) as PieceRow | undefined;
			return row ? { piece: toPiece(row), imageFile: row.image_file } : null;
		},
		listByAuthor(authorId, status) {
			const rows = (status
				? byAuthorAndStatus.all(authorId, status)
				: byAuthor.all(authorId)) as unknown as PieceRow[];
			return rows.map(toPiece);
		},
	};
}

let defaultRepository: PieceRepository | undefined;

/** Repository bound to the app database. */
export function pieceRepository(): PieceRepository {
	defaultRepository ??= createPieceRepository(getDb());
	return defaultRepository;
}
