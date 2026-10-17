"use client";

import Link from "next/link";
import { useState } from "react";
import { HighlightCard, HighlightRow } from "@/shared/ui/highlight-card";
import { CheckIcon, CloseIcon, EyeIcon } from "@/shared/ui/icons";
import { PillTabs } from "@/shared/ui/pill-tabs";
import { SearchField } from "@/shared/ui/search-field";
import type { ReviewResult } from "../domain/review";
import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { isToday, todayNote } from "./format";
import { LoadingBlock } from "./loading-block";
import { normalize } from "./normalize";
import { PageHeader } from "./page-header";
import { PieceWorkspace } from "./piece-workspace";
import { useReview } from "./review-session-provider";
import { QUEUE_ROUTES } from "./use-review-session";

type Tab = "pending" | "resolved";

const ROUTE_ORDER = { HUMAN_REVIEW: 0, ENRICH_WITH_LLM: 1, AUTO_APPROVE: 2, REJECT: 3 } as const;

function countToday(items: readonly ReviewResult[]): number {
	return items.filter((r) => isToday(r.piece.createdAt)).length;
}

/** Home: the three numbers that matter, then only the pieces that need the editor. */
export function InboxView() {
	const { hydrated, results, editorActions, status, submittedIds } = useReview();
	const [tab, setTab] = useState<Tab>("pending");
	const [query, setQuery] = useState("");

	const needle = normalize(query.trim());
	const matches = (r: ReviewResult) =>
		needle === "" || normalize(`${r.piece.title} ${r.piece.body}`).includes(needle);

	const queue = results.filter((r) => QUEUE_ROUTES.has(r.route));
	const pendingAll = queue.filter((r) => !editorActions[r.piece.id]);
	const pending = pendingAll.filter(matches).sort((a, b) => {
		// Pieces the editor just submitted first, then "Revisar" before "Mejorar con IA".
		const submitted = Number(submittedIds.has(b.piece.id)) - Number(submittedIds.has(a.piece.id));
		return submitted || ROUTE_ORDER[a.route] - ROUTE_ORDER[b.route];
	});
	const resolved = queue.filter((r) => editorActions[r.piece.id]).filter(matches);
	const items = tab === "pending" ? pending : resolved;
	const approved = results.filter((r) => r.route === "AUTO_APPROVE");
	const rejected = results.filter((r) => r.route === "REJECT");
	const total = results.length;

	const header = (
		<PageHeader
			title="Revisa el contenido de tu marca"
			description="Lo claro se aprueba o se descarta solo. Aquí te queda únicamente lo que necesita tu ojo."
			actions={
				results.length > 0 ? (
					<>
						<SearchField
							value={query}
							onChange={setQuery}
							label="Buscar en la bandeja"
							className="flex-1 sm:w-56 sm:flex-none"
						/>
						<AnalyzeButton variant="icon" />
					</>
				) : null
			}
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
					title={status === "running" ? "Revisando el contenido…" : "Tu bandeja está vacía"}
					action={<AnalyzeButton />}
				>
					<p>
						Prueba con el contenido de ejemplo para ver cómo funciona, o{" "}
						<Link href="/nueva" className="font-medium text-ink underline underline-offset-2">
							sube una pieza tuya
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
			<HighlightRow label="Resumen de la revisión">
				<HighlightCard
					tone="lilac"
					label="Aprobado solo"
					value={String(approved.length)}
					note={todayNote(countToday(approved), approved.length, total)}
					icon={<CheckIcon size={18} />}
				/>
				<HighlightCard
					tone="aqua"
					label="Necesita tu revisión"
					value={String(pendingAll.length)}
					note={todayNote(countToday(pendingAll), pendingAll.length, total)}
					icon={<EyeIcon size={18} />}
				/>
				<HighlightCard
					tone="plain"
					label="Descartado"
					value={String(rejected.length)}
					note={todayNote(countToday(rejected), rejected.length, total)}
					icon={<CloseIcon size={18} />}
				/>
			</HighlightRow>

			<div className="mt-10 mb-5 flex flex-wrap items-center justify-between gap-3">
				<PillTabs
					label="Estado de la bandeja"
					value={tab}
					onChange={setTab}
					tabs={[
						{ value: "pending", label: "Pendientes", count: pending.length },
						{ value: "resolved", label: "Resueltas", count: resolved.length },
					]}
				/>
				<p className="text-sm text-ink-muted">
					{total - queue.length} de {total} piezas se resolvieron sin ti
				</p>
			</div>
			<div role="tabpanel" aria-label={tab === "pending" ? "Pendientes" : "Resueltas"}>
				<PieceWorkspace
					key={`${tab}-${needle}`}
					items={items}
					listLabel={tab === "pending" ? "Piezas pendientes" : "Piezas resueltas"}
					backLabel="Volver a la bandeja"
					advanceOnResolve={tab === "pending"}
					empty={
						needle !== "" ? (
							<EmptyState title="Nada coincide con tu búsqueda">
								<p>Prueba con otra palabra o borra la búsqueda.</p>
							</EmptyState>
						) : tab === "pending" ? (
							<EmptyState title="Estás al día">
								<p>No queda nada por revisar. Lo que decidiste está en Resueltas.</p>
							</EmptyState>
						) : (
							<EmptyState title="Aún no decidiste ninguna pieza">
								<p>Cuando apruebes o rechaces una pieza aparecerá aquí, y podrás deshacerlo.</p>
							</EmptyState>
						)
					}
				/>
			</div>
		</>
	);
}
