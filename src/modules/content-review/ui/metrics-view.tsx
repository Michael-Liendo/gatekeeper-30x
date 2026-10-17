"use client";

import { AnalyzeButton } from "./analyze-button";
import { EmptyState } from "./empty-state";
import { KpiStrip } from "./kpi-strip";
import { ROUTE_LABEL, ROUTES } from "./labels";
import { LoadingBlock } from "./loading-block";
import { PageHeader } from "./page-header";
import { useReview } from "./review-session-provider";
import { RouteBar } from "./route-bar";

/** Batch KPIs, route distribution and expected-vs-decided matrix. */
export function MetricsView() {
	const { hydrated, metrics, results, submittedIds, editorActions, pieces, status, changedIds } =
		useReview();
	const batch = results.filter((r) => !submittedIds.has(r.piece.id));
	const editorDecisions = batch.filter((r) => editorActions[r.piece.id]).length;
	const labeled = batch.filter((r) => r.piece.expectedRoute);

	const header = (
		<PageHeader
			title="Métricas"
			description="Cuánto resuelve JEV solo, cuánto llega al equipo, qué tan preciso es y cuánto cuesta. Se recalculan con tu política."
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
				<EmptyState title="Sin métricas todavía" action={<AnalyzeButton />}>
					<p>Las métricas salen del análisis del contenido. Lánzalo y vuelve aquí.</p>
				</EmptyState>
			</>
		);
	}

	return (
		<>
			{header}
			<div className="grid gap-6">
				<KpiStrip metrics={metrics} results={batch} editorDecisions={editorDecisions} />
				<RouteBar
					metrics={metrics}
					pendingCount={pieces.length}
					running={status === "running"}
					changedCount={batch.filter((r) => changedIds.has(r.piece.id)).length}
				/>
				{labeled.length > 0 ? (
					<section
						aria-labelledby="matrix-title"
						className="grid gap-3 rounded-card border border-line bg-surface p-5"
					>
						<div className="grid gap-1">
							<h2 id="matrix-title" className="text-lg font-semibold">
								Esperado contra decidido
							</h2>
							<p className="text-sm text-ink-muted">
								Filas: ruta esperada en el dataset simulado. Columnas: ruta que decidió el
								gatekeeper.
							</p>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[32rem] text-sm">
								<thead>
									<tr className="text-xs text-ink-muted">
										<th scope="col" className="py-2 text-left font-medium">
											Esperado
										</th>
										{ROUTES.map((route) => (
											<th key={route} scope="col" className="py-2 text-right font-medium">
												{ROUTE_LABEL[route]}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-line">
									{ROUTES.map((expected) => (
										<tr key={expected}>
											<th scope="row" className="py-2 text-left font-medium">
												{ROUTE_LABEL[expected]}
											</th>
											{ROUTES.map((decided) => {
												const n = labeled.filter(
													(r) => r.piece.expectedRoute === expected && r.route === decided,
												).length;
												return (
													<td
														key={decided}
														className={`py-2 text-right font-mono ${
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
					</section>
				) : null}
			</div>
		</>
	);
}
