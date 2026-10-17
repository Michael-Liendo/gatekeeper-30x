import "server-only";
import type { DatabaseSync } from "node:sqlite";
import type { PieceEventRepository } from "@/modules/workspace/application/workspace-ports";
import type { PieceEvent, PieceEventType } from "@/modules/workspace/domain/workspace";
import { getDb } from "@/shared/db/sqlite";

interface EventRow {
	id: string;
	piece_id: string;
	type: string;
	actor_name: string;
	summary: string;
	created_at: string;
}

function toEvent(row: EventRow): PieceEvent {
	return {
		id: row.id,
		pieceId: row.piece_id,
		type: row.type as PieceEventType,
		actorName: row.actor_name,
		summary: row.summary,
		createdAt: row.created_at,
	};
}

/** Append-only history of a piece. */
export function createPieceEventRepository(db: DatabaseSync): PieceEventRepository {
	const insert = db.prepare(
		"INSERT INTO piece_events (id, piece_id, type, actor_name, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)",
	);
	// rowid breaks ties between events recorded in the same millisecond.
	const byPiece = db.prepare(
		"SELECT id, piece_id, type, actor_name, summary, created_at FROM piece_events WHERE piece_id = ? ORDER BY created_at, rowid",
	);

	return {
		add(event) {
			insert.run(
				event.id,
				event.pieceId,
				event.type,
				event.actorName,
				event.summary,
				event.createdAt,
			);
		},
		listByPiece(pieceId) {
			return (byPiece.all(pieceId) as unknown as EventRow[]).map(toEvent);
		},
	};
}

let defaultRepository: PieceEventRepository | undefined;

/** Repository bound to the app database. */
export function pieceEventRepository(): PieceEventRepository {
	defaultRepository ??= createPieceEventRepository(getDb());
	return defaultRepository;
}
