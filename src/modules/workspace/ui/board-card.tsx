"use client";

import Link from "next/link";
import { describePiece, pieceHighlights } from "@/modules/content-review/ui/labels";
import type { PieceStatus, TeamRole, WorkspacePiece } from "../domain/workspace";
import { ExampleChip } from "./example-chip";
import { MoveMenu } from "./move-menu";
import { RoleChip } from "./role-chip";
import { timeAgo } from "./workspace-labels";
import { WorkspaceThumb } from "./workspace-thumb";

interface BoardCardProps {
	piece: WorkspacePiece;
	role: TeamRole;
	moving: boolean;
	onMove: (piece: WorkspacePiece, status: PieceStatus) => void;
}

export const DRAG_TYPE = "application/x-gatekeeper-piece";

/** One piece on the board: thumbnail, title, author, reach and a "Mover a…" menu. */
export function BoardCard({ piece, role, moving, onMove }: BoardCardProps) {
	const reach = pieceHighlights(piece.review.answers ?? {}).reach;
	return (
		<li
			draggable
			onDragStart={(event) => {
				event.dataTransfer.setData(DRAG_TYPE, piece.id);
				event.dataTransfer.effectAllowed = "move";
			}}
			aria-busy={moving}
			className={`group relative grid gap-3 rounded-[20px] border border-line bg-surface p-3 transition-opacity ${
				moving ? "opacity-60" : ""
			}`}
		>
			<WorkspaceThumb piece={piece} size="wide" />
			<div className="flex items-start gap-2">
				<div className="grid min-w-0 flex-1 gap-1">
					<Link
						href={`/pieza/${encodeURIComponent(piece.id)}`}
						draggable={false}
						className="line-clamp-2 text-sm font-medium leading-snug after:absolute after:inset-0 after:rounded-[20px] hover:underline"
					>
						{piece.title}
					</Link>
					<p className="text-xs text-ink-muted">{describePiece(piece)}</p>
				</div>
				{/* Above the stretched link so the menu stays clickable. */}
				<div className="relative z-10 -mt-1 -mr-1">
					<MoveMenu
						current={piece.status}
						itemLabel={piece.title}
						disabled={moving}
						onMove={(status) => onMove(piece, status)}
					/>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
				<span className="truncate font-medium text-ink">{piece.authorName}</span>
				<RoleChip role={role} />
				{piece.isExample ? <ExampleChip /> : null}
			</div>
			<div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
				{reach ? (
					<span>
						Alcance: <span className="font-medium text-ink">{reach}</span>
					</span>
				) : (
					<span />
				)}
				<time dateTime={piece.updatedAt}>{timeAgo(piece.updatedAt)}</time>
			</div>
		</li>
	);
}
