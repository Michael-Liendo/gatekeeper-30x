"use client";

import type { Route } from "../domain/editorial-policy";
import { ROUTE_LABEL, ROUTE_STYLE, ROUTES } from "./labels";
import { PageHeader } from "./page-header";
import { PolicyPanel } from "./policy-panel";
import { useReview } from "./review-session-provider";
import { RouteBadge } from "./route-badge";

/** Threshold tuning with an instant preview of what moves where. */
export function PolicyView() {
	const { policy, setPolicy, resetPolicy, results, originalRoutes, changedIds, hydrated } =
		useReview();

	const before = new Map<Route, number>(ROUTES.map((r) => [r, 0]));
	const after = new Map<Route, number>(ROUTES.map((r) => [r, 0]));
	for (const result of results) {
		const original = originalRoutes.get(result.piece.id) ?? result.route;
		before.set(original, (before.get(original) ?? 0) + 1);
		after.set(result.route, (after.get(result.route) ?? 0) + 1);
	}
	const changed = results.filter((r) => changedIds.has(r.piece.id));

	return (
		<>
			<PageHeader
				title="Política editorial"
				description="Los umbrales son datos, no código. Al moverlos, las rutas se recalculan con las respuestas que JEV ya dio: sin otra llamada al modelo y sin desplegar nada."
			/>
			<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
				<PolicyPanel
					policy={policy}
					hasResults={hydrated && results.length > 0}
					changedCount={changedIds.size}
					onChange={setPolicy}
					onReset={resetPolicy}
				/>
				<section
					aria-labelledby="impact-title"
					className="grid gap-4 rounded-card border border-line bg-surface p-5"
				>
					<h2 id="impact-title" className="text-lg font-semibold">
						Impacto
					</h2>
					{results.length === 0 ? (
						<p className="text-sm text-ink-muted">
							Analiza el contenido para ver cómo cada cambio mueve las piezas entre rutas.
						</p>
					) : (
						<>
							<table className="w-full text-sm">
								<caption className="sr-only">
									Piezas por ruta antes y después de tu política
								</caption>
								<thead>
									<tr className="text-left text-xs text-ink-muted">
										<th scope="col" className="py-2 font-medium">
											Ruta
										</th>
										<th scope="col" className="py-2 text-right font-medium">
											Al analizar
										</th>
										<th scope="col" className="py-2 text-right font-medium">
											Con tu política
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-line">
									{ROUTES.map((route) => {
										const a = before.get(route) ?? 0;
										const b = after.get(route) ?? 0;
										const delta = b - a;
										return (
											<tr key={route}>
												<th scope="row" className="py-2 text-left font-medium">
													<span className="flex items-center gap-2">
														<span
															aria-hidden="true"
															className={`size-2 rounded-full ${ROUTE_STYLE[route].dot}`}
														/>
														{ROUTE_LABEL[route]}
													</span>
												</th>
												<td className="py-2 text-right font-mono">{a}</td>
												<td className="py-2 text-right font-mono">
													{b}
													{delta !== 0 ? (
														<span className="ml-1 text-xs text-ink-muted">
															({delta > 0 ? "+" : ""}
															{delta})
														</span>
													) : null}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							{changed.length > 0 ? (
								<div className="grid gap-2">
									<h3 className="text-sm font-semibold">Piezas que cambiaron de ruta</h3>
									<ul className="grid gap-2">
										{changed.map((result) => {
											const original = originalRoutes.get(result.piece.id);
											return (
												<li
													key={result.piece.id}
													className="grid gap-1 rounded-lg bg-surface-muted p-3"
												>
													<span className="text-sm font-medium">{result.piece.title}</span>
													<span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
														{original ? <RouteBadge route={original} /> : null}
														<span aria-hidden="true">→</span>
														<span className="sr-only">ahora</span>
														<RouteBadge route={result.route} />
													</span>
												</li>
											);
										})}
									</ul>
								</div>
							) : (
								<p className="text-sm text-ink-muted">Ninguna pieza cambió de ruta todavía.</p>
							)}
						</>
					)}
				</section>
			</div>
		</>
	);
}
