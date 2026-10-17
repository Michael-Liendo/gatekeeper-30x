"use client";

import Link from "next/link";
import { describePiece } from "@/modules/content-review/ui/labels";
import { RouteBadge } from "@/modules/content-review/ui/route-badge";
import { primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import { BoardIcon, CalendarIcon } from "@/shared/ui/icons";
import type { PieceStatus } from "../domain/workspace";
import type { BulkUploadResponse } from "./workspace-api";
import { formatScheduled, STATUS_LABEL, STATUS_STYLE } from "./workspace-labels";
import { WorkspaceThumb } from "./workspace-thumb";

/** Order of the summary cards: good news first. */
const RESULT_ORDER: readonly PieceStatus[] = ["approved", "needs_changes", "in_review", "rejected"];

const seconds = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

interface GridUploadResultsProps {
	result: BulkUploadResponse;
	/** Titles of the rows that were sent, by request index (to name failed rows). */
	sentTitles: string[];
	onUploadAnother: () => void;
}

/** "12 piezas revisadas en 9,4 s": counts by status, the list and where to go next. */
export function GridUploadResults({ result, sentTitles, onUploadAnother }: GridUploadResultsProps) {
	const total = result.created.length;
	const scheduled = result.created.filter((piece) => piece.scheduledFor).length;

	return (
		<div className="grid grid-cols-[minmax(0,1fr)] gap-6">
			<section
				aria-labelledby="grid-results-title"
				className="grid gap-5 rounded-card bg-linear-to-br from-lilac-from to-aqua-to p-6 sm:p-8"
			>
				<div className="grid gap-1">
					<h2 id="grid-results-title" className="text-2xl font-normal sm:text-3xl">
						{total === 1 ? "1 pieza revisada" : `${total} piezas revisadas`} en{" "}
						{seconds.format(result.totalMs / 1000)} s
					</h2>
					<p className="text-sm text-ink/70">
						JEV las revisó con tu marca.{" "}
						{scheduled > 0
							? `${scheduled === 1 ? "1 quedó programada" : `${scheduled} quedaron programadas`} en tu calendario.`
							: "Ninguna traía fecha, así que no aparecen en el calendario."}
					</p>
				</div>
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{RESULT_ORDER.map((status) => {
						const style = STATUS_STYLE[status];
						return (
							<div key={status} className="grid gap-1 rounded-2xl bg-surface/80 px-4 py-3">
								<dt className="flex items-center gap-2 text-xs text-ink-muted">
									<span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
									{STATUS_LABEL[status]}
								</dt>
								<dd className="text-3xl font-light tabular-nums">{result.byStatus[status] ?? 0}</dd>
							</div>
						);
					})}
				</dl>
				<div className="flex flex-wrap gap-3">
					<Link href="/campana" className={primaryButton}>
						<CalendarIcon size={18} />
						Ver calendario
					</Link>
					<Link href="/tablero" className={secondaryButton}>
						<BoardIcon size={18} />
						Ir al tablero
					</Link>
				</div>
			</section>

			{result.failed.length > 0 ? (
				<section
					aria-labelledby="grid-failed-title"
					className="grid gap-2 rounded-card bg-danger-soft p-5"
				>
					<h3 id="grid-failed-title" className="text-sm font-medium text-danger">
						{result.failed.length === 1
							? "1 pieza no se pudo revisar"
							: `${result.failed.length} piezas no se pudieron revisar`}
					</h3>
					<ul className="grid gap-1 text-sm">
						{result.failed.map((failure) => (
							<li key={failure.index}>
								<span className="font-medium">
									{sentTitles[failure.index] ?? `Pieza ${failure.index + 1}`}
								</span>
								: {failure.error}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{total > 0 ? (
				<section aria-labelledby="grid-created-title" className="grid gap-3">
					<h3 id="grid-created-title" className="text-sm font-medium">
						Lo que dijo JEV de cada pieza
					</h3>
					<ul className="grid gap-2">
						{result.created.map((piece) => (
							<li key={piece.id}>
								<Link
									href={`/pieza/${encodeURIComponent(piece.id)}`}
									className="flex items-center gap-3 rounded-[20px] border border-line p-3 transition-colors hover:bg-surface-muted sm:gap-4"
								>
									<WorkspaceThumb piece={piece} />
									<div className="grid min-w-0 flex-1 gap-0.5">
										<span className="truncate text-sm font-medium">{piece.title}</span>
										<span className="text-xs text-ink-muted">
											{describePiece(piece)}
											{piece.scheduledFor ? ` · ${formatScheduled(piece.scheduledFor)}` : ""}
										</span>
									</div>
									<RouteBadge route={piece.review.route} />
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<button
				type="button"
				onClick={onUploadAnother}
				className={`${secondaryButton} justify-self-start`}
			>
				Cargar otra grilla
			</button>
		</div>
	);
}
