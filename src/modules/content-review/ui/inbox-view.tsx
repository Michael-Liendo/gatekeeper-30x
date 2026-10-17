"use client";

import Link from "next/link";
import { useState } from "react";
import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { LoadingBlock } from "./loading-block";
import { PageHeader } from "./page-header";
import { PieceWorkspace } from "./piece-workspace";
import { useReview } from "./review-session-provider";
import { QUEUE_ROUTES } from "./use-review-session";

type Tab = "pending" | "resolved";

const ROUTE_ORDER = { HUMAN_REVIEW: 0, ENRICH_WITH_LLM: 1, AUTO_APPROVE: 2, REJECT: 3 } as const;

/** The editor's queue: only the pieces JEV could not settle on its own. */
export function InboxView() {
	const { hydrated, results, editorActions, status, submittedIds } = useReview();
	const [tab, setTab] = useState<Tab>("pending");

	const queue = results.filter((r) => QUEUE_ROUTES.has(r.route));
	const pending = queue
		.filter((r) => !editorActions[r.piece.id])
		.sort((a, b) => {
			// Pieces the editor just submitted first, then human review before AI adjustments.
			const submitted = Number(submittedIds.has(b.piece.id)) - Number(submittedIds.has(a.piece.id));
			return submitted || ROUTE_ORDER[a.route] - ROUTE_ORDER[b.route];
		});
	const resolved = queue.filter((r) => editorActions[r.piece.id]);
	const items = tab === "pending" ? pending : resolved;
	const autoResolved = results.length - queue.length;

	const header = (
		<PageHeader
			title="Bandeja"
			description="Solo lo que JEV no pudo resolver solo: piezas para revisión humana o para ajustar con IA."
		/>
	);

	if (!hydrated) {
		return (
			<>
				{header}
				<LoadingBlock />
			</>
		);
	}

	if (results.length === 0) {
		return (
			<>
				{header}
				<EmptyState
					title={status === "running" ? "Analizando el contenido…" : "Tu bandeja está vacía"}
					action={<AnalyzeButton />}
				>
					<p>
						Analiza el contenido de 30X Media: JEV responde preguntas tipadas sobre cada pieza y la
						política editorial decide si se aprueba, se ajusta con IA, se descarta o llega aquí para
						que la revises. También puedes{" "}
						<Link href="/nueva" className="font-medium text-ink underline underline-offset-2">
							enviar una pieza nueva
						</Link>
						.
					</p>
				</EmptyState>
			</>
		);
	}

	return (
		<>
			{header}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Estado de la bandeja"
					className="flex gap-1 rounded-lg bg-surface-muted p-1"
				>
					{(
						[
							["pending", "Pendientes", pending.length],
							["resolved", "Resueltas", resolved.length],
						] as const
					).map(([value, label, count]) => (
						<button
							key={value}
							type="button"
							role="tab"
							aria-selected={tab === value}
							onClick={() => setTab(value)}
							className="min-h-10 rounded-md px-3 text-sm font-medium text-ink-muted aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
						>
							{label} <span className="font-mono text-xs">{count}</span>
						</button>
					))}
				</div>
				<p className="text-sm text-ink-muted">
					{autoResolved} de {results.length} piezas se resolvieron sin ti.
				</p>
			</div>
			<div role="tabpanel" aria-label={tab === "pending" ? "Pendientes" : "Resueltas"}>
				<PieceWorkspace
					key={tab}
					items={items}
					listLabel={tab === "pending" ? "Piezas pendientes" : "Piezas resueltas"}
					backLabel="Volver a la bandeja"
					advanceOnResolve={tab === "pending"}
					empty={
						tab === "pending" ? (
							<EmptyState title="Bandeja al día">
								<p>
									No queda nada por revisar con la política actual. Las decisiones que tomaste están
									en Resueltas.
								</p>
							</EmptyState>
						) : (
							<EmptyState title="Aún no resolviste ninguna pieza">
								<p>
									Cuando apruebes, ajustes o rechaces una pieza aparecerá aquí, con opción de
									deshacer.
								</p>
							</EmptyState>
						)
					}
				/>
			</div>
		</>
	);
}
