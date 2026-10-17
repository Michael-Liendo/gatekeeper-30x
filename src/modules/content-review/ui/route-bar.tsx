import type { ReviewMetrics } from "../domain/review";
import { formatPercent } from "./format";
import { ROUTE_HINT, ROUTE_LABEL, ROUTE_STYLE, ROUTES } from "./labels";

interface RouteBarProps {
	metrics: ReviewMetrics;
	changedCount: number;
}

/** One soft bar per route: where the content ended up, in whole percentages. */
export function RouteBar({ metrics, changedCount }: RouteBarProps) {
	const total = metrics.total;
	const max = Math.max(1, ...ROUTES.map((route) => metrics.byRoute[route]));

	return (
		<section
			aria-labelledby="route-bar-title"
			className="grid gap-6 rounded-card border border-line p-6 sm:p-8"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 id="route-bar-title" className="text-lg font-normal">
					A dónde va tu contenido
				</h2>
				<p aria-live="polite" className="text-sm text-ink-muted">
					{changedCount === 0
						? `${total} piezas de ejemplo`
						: `${changedCount} ${changedCount === 1 ? "cambió" : "cambiaron"} con tu política`}
				</p>
			</div>
			<ul className="grid gap-5">
				{ROUTES.map((route) => {
					const count = metrics.byRoute[route];
					const share = total ? count / total : 0;
					return (
						<li key={route} className="grid gap-2">
							<div className="flex items-baseline justify-between gap-3">
								<span className="grid gap-0.5">
									<span className="text-sm font-medium">{ROUTE_LABEL[route]}</span>
									<span className="text-xs text-ink-muted">{ROUTE_HINT[route]}</span>
								</span>
								<span className="text-sm tabular-nums">
									{count} <span className="text-ink-muted">({formatPercent(share)})</span>
								</span>
							</div>
							<div aria-hidden="true" className="h-3 rounded-full bg-surface-muted">
								<div
									className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${ROUTE_STYLE[route].dot}`}
									style={{ width: `${(count / max) * 100}%` }}
								/>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
