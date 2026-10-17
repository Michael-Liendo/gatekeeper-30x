"use client";

import { useId, useState } from "react";
import type { Route } from "../domain/editorial-policy";
import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { ROUTE_LABEL, ROUTE_STYLE, ROUTES } from "./labels";
import { LoadingBlock } from "./loading-block";
import { PageHeader } from "./page-header";
import { PieceWorkspace } from "./piece-workspace";
import { useReview } from "./review-session-provider";

type Filter = Route | "ALL" | "MISMATCH" | "SUBMITTED";

function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

/** Every reviewed piece, filterable by route, with the same detail as the inbox. */
export function ContentView() {
	const { hydrated, results, submittedIds } = useReview();
	const [filter, setFilter] = useState<Filter>("ALL");
	const [query, setQuery] = useState("");
	const searchId = useId();

	const header = (
		<PageHeader
			title="Todo el contenido"
			description="Cada pieza analizada con su ruta actual. Las rutas se recalculan al cambiar la política."
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
				<EmptyState title="Todavía no hay contenido analizado" action={<AnalyzeButton />}>
					<p>Analiza el contenido para ver aquí cada pieza con su ruta, sus razones y su costo.</p>
				</EmptyState>
			</>
		);
	}

	const counts = (predicate: (r: (typeof results)[number]) => boolean) =>
		results.filter(predicate).length;
	const filters: { value: Filter; label: string; count: number; dot?: string }[] = [
		{ value: "ALL", label: "Todas", count: results.length },
		...ROUTES.map((route) => ({
			value: route,
			label: ROUTE_LABEL[route],
			count: counts((r) => r.route === route),
			dot: ROUTE_STYLE[route].dot,
		})),
		{
			value: "MISMATCH",
			label: "No coinciden con lo esperado",
			count: counts((r) => r.matchesExpected === false),
		},
	];
	if (submittedIds.size > 0) {
		filters.push({ value: "SUBMITTED", label: "Enviadas por ti", count: submittedIds.size });
	}

	const needle = normalize(query.trim());
	const items = results.filter((r) => {
		if (filter === "MISMATCH" && r.matchesExpected !== false) return false;
		if (filter === "SUBMITTED" && !submittedIds.has(r.piece.id)) return false;
		if (filter !== "ALL" && filter !== "MISMATCH" && filter !== "SUBMITTED" && r.route !== filter)
			return false;
		return needle === "" || normalize(`${r.piece.title} ${r.piece.body}`).includes(needle);
	});

	return (
		<>
			{header}
			<div className="mb-4 grid gap-3">
				<div className="grid max-w-md gap-1">
					<label htmlFor={searchId} className="text-sm font-medium">
						Buscar
					</label>
					<input
						id={searchId}
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Título o texto"
						className="min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-sm"
					/>
				</div>
				<fieldset className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
					<legend className="sr-only">Filtrar por ruta</legend>
					{filters.map((option) => (
						<button
							key={option.value}
							type="button"
							aria-pressed={filter === option.value}
							onClick={() => setFilter(option.value)}
							className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 text-sm hover:border-line-strong aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-ink"
						>
							{option.dot ? (
								<span aria-hidden="true" className={`size-2 rounded-full ${option.dot}`} />
							) : null}
							{option.label}
							<span className="font-mono text-xs opacity-70">{option.count}</span>
						</button>
					))}
				</fieldset>
			</div>
			<PieceWorkspace
				key={`${filter}-${needle}`}
				items={items}
				listLabel="Piezas"
				backLabel="Volver al contenido"
				empty={
					<EmptyState title="Ninguna pieza coincide">
						<p>Prueba con otro filtro o borra la búsqueda.</p>
					</EmptyState>
				}
			/>
		</>
	);
}
