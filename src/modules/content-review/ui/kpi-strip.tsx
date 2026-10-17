import type { ReviewMetrics, ReviewResult } from "../domain/review";
import { formatMs, formatPercent, formatUsd } from "./format";

interface KpiStripProps {
	metrics: ReviewMetrics | null;
	results: readonly ReviewResult[];
	editorDecisions: number;
}

interface Kpi {
	label: string;
	value: string;
	detail: string;
}

function buildKpis({ metrics, results, editorDecisions }: KpiStripProps): Kpi[] {
	if (!metrics) {
		return [
			{ label: "Automático", value: "—", detail: "Aprobado o descartado sin persona" },
			{ label: "Escalado a persona", value: "—", detail: "Revisión humana" },
			{ label: "Precisión vs. esperado", value: "—", detail: "Sobre el dataset etiquetado" },
			{ label: "Latencia promedio", value: "—", detail: "Por pieza" },
			{ label: "Costo por 1.000 piezas", value: "—", detail: "Proyectado del lote" },
			{ label: "Respaldo OpenAI", value: "—", detail: "Piezas sin respuesta de JEV" },
		];
	}

	const labeled = results.filter((r) => r.piece.expectedRoute).length;
	const correct = results.filter((r) => r.matchesExpected === true).length;
	const human = metrics.byRoute.HUMAN_REVIEW;

	return [
		{
			label: "Automático",
			value: formatPercent(metrics.automationRate),
			detail: `${metrics.byRoute.AUTO_APPROVE + metrics.byRoute.REJECT} de ${metrics.total} sin tocar una persona`,
		},
		{
			label: "Escalado a persona",
			value: formatPercent(metrics.escalationRate),
			detail:
				editorDecisions > 0
					? `${human} en revisión, ${editorDecisions} ya decididas`
					: `${human} ${human === 1 ? "pieza llega" : "piezas llegan"} al equipo`,
		},
		{
			label: "Precisión vs. esperado",
			value: formatPercent(metrics.accuracy),
			detail: labeled > 0 ? `${correct} de ${labeled} en la ruta esperada` : "Sin etiquetas",
		},
		{
			label: "Latencia promedio",
			value: formatMs(metrics.avgLatencyMs),
			detail: "Respuesta del modelo por pieza",
		},
		{
			label: "Costo por 1.000 piezas",
			value: formatUsd(metrics.costPer1kUsd),
			detail: `Este lote: ${formatUsd(metrics.totalCostUsd)}`,
		},
		{
			label: "Respaldo OpenAI",
			value: String(metrics.fallbackCount),
			detail: metrics.fallbackCount === 0 ? "JEV respondió todas" : "Piezas que respondió OpenAI",
		},
	];
}

/** Six headline numbers for the batch, recomputed live with the policy. */
export function KpiStrip(props: KpiStripProps) {
	return (
		<section aria-label="Indicadores del lote">
			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
				{buildKpis(props).map((kpi) => (
					<div
						key={kpi.label}
						className="grid min-w-0 content-start gap-1 rounded-card border border-line bg-surface p-4"
					>
						<dt className="text-sm text-ink-muted">{kpi.label}</dt>
						<dd className="break-words font-mono text-xl font-semibold tabular-nums leading-tight sm:text-2xl">
							{kpi.value}
						</dd>
						<dd className="text-xs leading-snug text-ink-muted">{kpi.detail}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
