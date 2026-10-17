import type { Route } from "../domain/editorial-policy";
import type { ReviewMetrics } from "../domain/review";
import { formatPercent } from "./format";
import { ROUTE_HINT, ROUTE_LABEL, ROUTE_STYLE, ROUTES } from "./labels";

interface RouteBarProps {
	metrics: ReviewMetrics | null;
	pendingCount: number;
	running: boolean;
	changedCount: number;
}

/** Stacked bar with the share of pieces per route, its legend and the live-change note. */
export function RouteBar({ metrics, pendingCount, running, changedCount }: RouteBarProps) {
	const total = metrics?.total ?? 0;

	return (
		<section
			aria-labelledby="route-bar-title"
			className="grid gap-4 rounded-card border border-line bg-surface p-5"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 id="route-bar-title" className="text-lg font-semibold">
					Distribución de rutas
				</h2>
				<p aria-live="polite" className="text-sm text-ink-muted">
					{metrics
						? changedCount === 0
							? "Con la política del análisis"
							: `${changedCount} ${changedCount === 1 ? "pieza cambió" : "piezas cambiaron"} de ruta con tu política`
						: running
							? "JEV está respondiendo…"
							: `${pendingCount} piezas por analizar`}
				</p>
			</div>

			<div aria-hidden="true" className="flex h-3.5 gap-0.5">
				{metrics && total > 0 ? (
					ROUTES.filter((route) => metrics.byRoute[route] > 0).map((route) => (
						<div
							key={route}
							className={`h-full rounded-[3px] motion-safe:transition-[flex-grow] motion-safe:duration-300 ${ROUTE_STYLE[route].dot}`}
							style={{ flexGrow: metrics.byRoute[route], flexBasis: 0 }}
						/>
					))
				) : (
					<div
						className={`h-full flex-1 rounded-[3px] bg-pending ${running ? "animate-pulse" : ""}`}
					/>
				)}
			</div>

			<ul className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
				{ROUTES.map((route: Route) => {
					const count = metrics?.byRoute[route] ?? null;
					return (
						<li key={route} className="grid gap-0.5">
							<span className="flex items-center gap-2 text-sm font-semibold">
								<span
									aria-hidden="true"
									className={`size-2.5 rounded-full ${ROUTE_STYLE[route].dot}`}
								/>
								{ROUTE_LABEL[route]}
							</span>
							<span className="font-mono text-sm tabular-nums">
								{count === null ? "—" : `${count} · ${formatPercent(total ? count / total : 0)}`}
							</span>
							<span className="text-xs text-ink-muted">{ROUTE_HINT[route]}</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
