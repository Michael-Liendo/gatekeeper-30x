"use client";

import { HighlightCard, HighlightRow } from "@/shared/ui/highlight-card";
import { CheckIcon, ChevronDownIcon, ClockIcon, EyeIcon, SparkleIcon } from "@/shared/ui/icons";
import type { ReviewMetrics } from "../domain/review";
import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { formatMs, formatPercent } from "./format";
import { ROUTE_LABEL, ROUTES } from "./labels";
import { LoadingBlock } from "./loading-block";
import { PageHeader } from "./page-header";
import { useReview } from "./review-session-provider";
import { RouteBar } from "./route-bar";
import { StressCard } from "./stress-card";

/** "Decide en menos de un segundo" / "Decide en unos 3 segundos". */
function speedText(avgMs: number): string {
	if (avgMs < 1000) return "Decide en menos de un segundo";
	const seconds = Math.round(avgMs / 1000);
	return `Decide en unos ${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}

function techFacts(metrics: ReviewMetrics) {
	return [
		{ label: "Latencia promedio", value: formatMs(metrics.avgLatencyMs) },
		{
			label: "Respuestas de respaldo (OpenAI)",
			value: String(metrics.fallbackCount),
		},
		{ label: "Solo revisión humana", value: formatPercent(metrics.escalationRate) },
	];
}

/** Three numbers, one chart and what changes for the team in plain words. Detail stays collapsed. */
export function MetricsView() {
	const { hydrated, metrics, results, submittedIds, changedIds } = useReview();
	const batch = results.filter((r) => !submittedIds.has(r.piece.id));
	const labeled = batch.filter((r) => r.piece.expectedRoute);

	const header = (
		<PageHeader
			title="Cuánto trabajo te ahorra"
			description="Calculado sobre el contenido de ejemplo de 30X con tu política actual."
			actions={metrics ? <AnalyzeButton variant="icon" /> : null}
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

	if (!metrics) {
		return (
			<>
				{header}
				<div className="grid gap-8">
					<EmptyState title="Aún no hay números" action={<AnalyzeButton />}>
						<p>Revisa el contenido de ejemplo y vuelve aquí para ver cuánto se resuelve solo.</p>
					</EmptyState>
					<StressCard />
				</div>
			</>
		);
	}

	const toYou = metrics.byRoute.HUMAN_REVIEW + metrics.byRoute.ENRICH_WITH_LLM;

	return (
		<>
			{header}
			<div className="grid gap-8">
				<HighlightRow label="Resumen">
					<HighlightCard
						tone="lilac"
						label="Se resuelve solo"
						value={formatPercent(metrics.automationRate)}
						note={`${metrics.byRoute.AUTO_APPROVE + metrics.byRoute.REJECT} de ${metrics.total}`}
						icon={<SparkleIcon size={18} />}
					/>
					<HighlightCard
						tone="aqua"
						label="Te llega a ti"
						value={formatPercent(metrics.total ? toYou / metrics.total : 0)}
						note={`${toYou} de ${metrics.total}`}
						icon={<EyeIcon size={18} />}
					/>
					<HighlightCard
						tone="plain"
						label="Acierta"
						value={formatPercent(metrics.accuracy)}
						note={labeled.length > 0 ? "frente a lo esperado" : "sin datos"}
						icon={<CheckIcon size={18} />}
					/>
				</HighlightRow>

				<ul className="grid gap-3 sm:grid-cols-2">
					<li className="flex items-center gap-3 rounded-[20px] bg-surface-muted px-5 py-4 text-sm">
						<ClockIcon size={20} className="shrink-0" />
						{speedText(metrics.avgLatencyMs)}
					</li>
					<li className="flex items-center gap-3 rounded-[20px] bg-surface-muted px-5 py-4 text-sm">
						<EyeIcon size={20} className="shrink-0" />
						{metrics.total - toYou} de {metrics.total} piezas ya no pasan por tu equipo
					</li>
				</ul>

				<StressCard />

				<RouteBar
					metrics={metrics}
					changedCount={batch.filter((r) => changedIds.has(r.piece.id)).length}
				/>

				<details className="group rounded-card border border-line">
					<summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 text-sm text-ink-muted [&::-webkit-details-marker]:hidden">
						Ver detalle técnico
						<ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
					</summary>
					<div className="grid gap-6 border-t border-line px-6 py-6">
						<dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
							{techFacts(metrics).map((fact) => (
								<div key={fact.label} className="grid min-w-0 gap-0.5">
									<dt className="text-xs text-ink-muted">{fact.label}</dt>
									<dd className="break-words font-mono text-sm tabular-nums">{fact.value}</dd>
								</div>
							))}
						</dl>
						{labeled.length > 0 ? (
							<div className="grid gap-2">
								<h3 className="text-xs text-ink-muted">
									Esperado (filas) contra decidido (columnas), dataset simulado
								</h3>
								<div className="overflow-x-auto">
									<table className="w-full min-w-[32rem] font-mono text-xs">
										<thead>
											<tr className="text-ink-muted">
												<th scope="col" className="py-2 text-left font-normal">
													Esperado
												</th>
												{ROUTES.map((route) => (
													<th key={route} scope="col" className="py-2 text-right font-normal">
														{ROUTE_LABEL[route]}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y divide-line">
											{ROUTES.map((expected) => (
												<tr key={expected}>
													<th scope="row" className="py-2 text-left font-normal">
														{ROUTE_LABEL[expected]}
													</th>
													{ROUTES.map((decided) => {
														const n = labeled.filter(
															(r) => r.piece.expectedRoute === expected && r.route === decided,
														).length;
														return (
															<td
																key={decided}
																className={`py-2 text-right ${
																	expected === decided
																		? "font-semibold text-ink"
																		: n > 0
																			? "text-danger"
																			: "text-ink-muted"
																}`}
															>
																{n}
															</td>
														);
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : null}
					</div>
				</details>
			</div>
		</>
	);
}
