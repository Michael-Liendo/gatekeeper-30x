"use client";

import { useState } from "react";
import { type PillTab, PillTabs } from "@/shared/ui/pill-tabs";
import { SearchField } from "@/shared/ui/search-field";
import type { Route } from "../domain/editorial-policy";
import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { ROUTE_LABEL, ROUTES } from "./labels";
import { LoadingBlock } from "./loading-block";
import { normalize } from "./normalize";
import { PageHeader } from "./page-header";
import { PieceWorkspace } from "./piece-workspace";
import { useReview } from "./review-session-provider";

type Filter = Route | "ALL" | "MISMATCH" | "SUBMITTED";

/** Every reviewed piece, filterable by route, with the same detail as the inbox. */
export function ContentView() {
	const { hydrated, results, submittedIds } = useReview();
	const [filter, setFilter] = useState<Filter>("ALL");
	const [query, setQuery] = useState("");

	const header = (
		<PageHeader
			title="Todo tu contenido"
			description="Cada pieza revisada y qué se decidió. Si cambias tu política, se reordena al instante."
			actions={
				results.length > 0 ? (
					<>
						<SearchField
							value={query}
							onChange={setQuery}
							label="Buscar contenido"
							placeholder="Buscar por título o texto"
							className="flex-1 sm:w-64 sm:flex-none"
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
				<EmptyState title="Todavía no hay contenido revisado" action={<AnalyzeButton />}>
					<p>Cuando revises contenido verás aquí cada pieza y qué se decidió con ella.</p>
				</EmptyState>
			</>
		);
	}

	const count = (predicate: (r: (typeof results)[number]) => boolean) =>
		results.filter(predicate).length;
	const mismatches = count((r) => r.matchesExpected === false);
	const filters: PillTab<Filter>[] = [
		{ value: "ALL", label: "Todas", count: results.length },
		...ROUTES.map((route) => ({
			value: route,
			label: ROUTE_LABEL[route],
			count: count((r) => r.route === route),
		})),
	];
	if (submittedIds.size > 0) {
		filters.push({ value: "SUBMITTED", label: "Subidas por ti", count: submittedIds.size });
	}
	if (mismatches > 0) {
		filters.push({ value: "MISMATCH", label: "Distintas a lo esperado", count: mismatches });
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
			<PillTabs
				mode="filter"
				label="Filtrar por decisión"
				value={filter}
				onChange={setFilter}
				tabs={filters}
				className="-mx-4 mb-6 px-4 sm:mx-0 sm:flex-wrap sm:px-0"
			/>
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
