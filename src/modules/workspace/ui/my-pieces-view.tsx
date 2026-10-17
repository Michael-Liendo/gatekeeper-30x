"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { EmptyState } from "@/modules/content-review/ui/empty-state";
import { describePiece } from "@/modules/content-review/ui/labels";
import { LoadingBlock } from "@/modules/content-review/ui/loading-block";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { ghostButton, primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import { PlusIcon } from "@/shared/ui/icons";
import { PillTabs } from "@/shared/ui/pill-tabs";
import { useToast } from "@/shared/ui/toast";
import type { PieceStatus } from "../domain/workspace";
import { ExampleChip } from "./example-chip";
import { LoadExamplesButton } from "./load-examples-button";
import { StatusPill } from "./status-pill";
import { usePieces } from "./use-pieces";
import { messageOf, removeExamples } from "./workspace-api";
import { STATUS_LABEL, STATUSES, timeAgo, topReason } from "./workspace-labels";
import { WorkspaceThumb } from "./workspace-thumb";

type Filter = "all" | PieceStatus;

/** /mis-piezas: what the person submitted, its status and what they were asked to change. */
export function MyPiecesView() {
	const { state, retry } = usePieces();
	const { user } = useSession();
	const { notify } = useToast();
	const [filter, setFilter] = useState<Filter>("all");
	const [removing, setRemoving] = useState(false);

	const hasExamples = state.status === "ready" && state.pieces.some((piece) => piece.isExample);

	async function clearExamples() {
		if (!window.confirm("¿Quitar las piezas de ejemplo? Tus piezas no se tocan.")) return;
		setRemoving(true);
		try {
			const { removed } = await removeExamples();
			notify(
				removed === 1 ? "Quitamos 1 pieza de ejemplo" : `Quitamos ${removed} piezas de ejemplo`,
			);
			setFilter("all");
			retry();
		} catch (error) {
			notify(messageOf(error));
		} finally {
			setRemoving(false);
		}
	}

	const header = (
		<PageHeader
			title="Mis piezas"
			description="Lo que subiste, en qué estado está y qué te pidieron cambiar."
			actions={
				<>
					{hasExamples ? (
						<button
							type="button"
							onClick={() => void clearExamples()}
							disabled={removing}
							aria-busy={removing}
							className={ghostButton}
						>
							{removing ? "Quitando ejemplos…" : "Quitar ejemplos"}
						</button>
					) : null}
					<Link href="/nueva" className={primaryButton}>
						<PlusIcon size={18} />
						Subir pieza
					</Link>
				</>
			}
		/>
	);

	if (state.status === "loading") {
		return (
			<>
				{header}
				<LoadingBlock />
			</>
		);
	}
	if (state.status === "error") {
		return (
			<>
				{header}
				<EmptyState
					title="No pudimos cargar tus piezas"
					action={
						<button type="button" onClick={retry} className={secondaryButton}>
							Reintentar
						</button>
					}
				>
					{state.message}
				</EmptyState>
			</>
		);
	}

	const mine = user ? state.pieces.filter((piece) => piece.authorId === user.id) : state.pieces;
	if (mine.length === 0) {
		return (
			<>
				{header}
				<EmptyState
					title="Todavía no subiste piezas"
					action={
						<div className="flex flex-wrap gap-3">
							<Link href="/nueva" className={primaryButton}>
								Sube tu primera pieza
							</Link>
							<LoadExamplesButton onLoaded={retry} />
						</div>
					}
				>
					Sube una captura o el texto de un post y en segundos sabrás si está lista para publicar. O
					carga unas piezas de ejemplo para ver cómo funciona.
				</EmptyState>
			</>
		);
	}

	const tabs = [
		{ value: "all" as Filter, label: "Todas", count: mine.length },
		...STATUSES.map((status) => ({
			value: status as Filter,
			label: STATUS_LABEL[status],
			count: mine.filter((piece) => piece.status === status).length,
		})),
	];
	const visible = filter === "all" ? mine : mine.filter((piece) => piece.status === filter);

	return (
		<>
			{header}
			<div className="grid gap-5">
				<PillTabs
					tabs={tabs}
					value={filter}
					onChange={setFilter}
					label="Filtrar por estado"
					mode="filter"
				/>
				{visible.length === 0 ? (
					<p className="rounded-card bg-surface-muted px-5 py-6 text-sm text-ink-muted">
						No tienes piezas en «{filter === "all" ? "Todas" : STATUS_LABEL[filter]}».
					</p>
				) : (
					<ul className="grid gap-2">
						{visible.map((piece) => {
							const reason = topReason(piece);
							return (
								<li key={piece.id}>
									<Link
										href={`/pieza/${encodeURIComponent(piece.id)}`}
										className="flex items-center gap-3 rounded-[20px] border border-line p-3 transition-colors hover:bg-surface-muted sm:gap-4 sm:p-4"
									>
										<WorkspaceThumb piece={piece} size="lg" />
										<div className="grid min-w-0 flex-1 gap-1">
											<p className="flex min-w-0 items-center gap-2">
												<span className="truncate text-sm font-medium">{piece.title}</span>
												{piece.isExample ? <ExampleChip /> : null}
											</p>
											<p className="text-xs text-ink-muted">
												{describePiece(piece)}
												{piece.version > 1 ? ` · Versión ${piece.version}` : ""} ·{" "}
												<time dateTime={piece.updatedAt}>{timeAgo(piece.updatedAt)}</time>
											</p>
											{reason ? (
												<p className="line-clamp-2 text-xs text-ink">
													<span className="text-ink-muted">Te pidieron: </span>
													{reason}
												</p>
											) : null}
										</div>
										<StatusPill status={piece.status} />
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</>
	);
}
