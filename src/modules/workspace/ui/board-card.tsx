"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { describePiece, pieceHighlights } from "@/modules/content-review/ui/labels";
import { SparkleIcon } from "@/shared/ui/icons";
import type { PieceStatus, TeamRole, WorkspacePiece } from "../domain/workspace";
import { DemoPublishButton } from "./demo-publish-button";
import { ExampleChip } from "./example-chip";
import { MoveMenu } from "./move-menu";
import { requestImprove } from "./regenerate-panel";
import { RoleChip } from "./role-chip";
import { formatScheduled, timeAgo } from "./workspace-labels";
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
	const router = useRouter();
	const reach = pieceHighlights(piece.review.answers ?? {}).reach;
	const pieceHref = `/pieza/${encodeURIComponent(piece.id)}`;
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
						href={pieceHref}
						draggable={false}
						className="line-clamp-2 text-sm font-medium leading-snug after:absolute after:inset-0 after:rounded-[20px] hover:underline"
					>
						{piece.title}
					</Link>
					<p className="text-xs text-ink-muted">{describePiece(piece)}</p>
					{piece.scheduledFor ? (
						<p className="text-xs text-ink-muted">
							Programada:{" "}
							<time dateTime={piece.scheduledFor} className="font-medium text-ink">
								{formatScheduled(piece.scheduledFor)}
							</time>
						</p>
					) : null}
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
			{piece.status === "approved" ? <DemoPublishButton piece={piece} /> : null}
			{piece.status === "needs_changes" ? (
				// Above the stretched link; the tooltip says what the AI will do.
				<div className="group/improve relative z-10">
					<button
						type="button"
						disabled={moving}
						aria-describedby={`improve-hint-${piece.id}`}
						onClick={() => {
							requestImprove(piece.id);
							router.push(pieceHref);
						}}
						className="flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-lilac-from to-lilac-to px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
					>
						<SparkleIcon size={16} />
						Mejorar con IA
					</button>
					<span
						role="tooltip"
						id={`improve-hint-${piece.id}`}
						className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-2xl bg-ink px-3 py-2 text-center text-xs leading-snug text-surface opacity-0 shadow-lg transition-opacity group-focus-within/improve:opacity-100 group-hover/improve:opacity-100"
					>
						Te reescribimos el texto y te generamos una imagen mejor para tu negocio. JEV la revisa
						antes de que la uses.
					</span>
				</div>
			) : null}
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
