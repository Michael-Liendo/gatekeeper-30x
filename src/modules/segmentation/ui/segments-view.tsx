"use client";

import { useState } from "react";
import { EmptyState } from "@/modules/content-review/ui/empty-state";
import { formatPercent, formatUsd } from "@/modules/content-review/ui/format";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { ghostButton, primaryButton } from "@/shared/ui/button-styles";
import { HighlightCard, HighlightRow } from "@/shared/ui/highlight-card";
import { CheckIcon, ChevronDownIcon, ClockIcon, CloseIcon, SparkleIcon } from "@/shared/ui/icons";
import { PillTabs } from "@/shared/ui/pill-tabs";
import type { SegmentBatchResponse, SegmentedRow } from "../application/segment-batch";
import { isKnown, PROGRAM_LABEL } from "../domain/profile";
import type { SegmentMetrics } from "../domain/segment-metrics";
import { ACTION_LABEL, type NextAction } from "../domain/segment-policy";
import { NewLeadForm } from "./new-lead-form";
import { RecalculatePanel } from "./recalculate-panel";
import { runSegmentBatch } from "./segment-api";
import { SegmentSummary, topicsLine, whoLine } from "./segment-bits";

const SAMPLE_SIZE = 100;

type Filter = "all" | "match" | "miss";

/** "3,4 s" / "< 1 s" (non-breaking space so the unit never wraps). */
function secondsText(ms: number): string {
	if (ms < 1000) return "<\u00a01\u00a0s";
	return `${(ms / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}\u00a0s`;
}

function costNote(totalUsd: number, count: number): string {
	const cents = Math.round(totalUsd * 100);
	if (totalUsd * 100 < 1) return `menos de 1 centavo de dólar por ${count} inscritos`;
	if (cents === 1) return `cerca de 1 centavo de dólar por ${count} inscritos`;
	return `unos ${cents} centavos de dólar por ${count} inscritos`;
}

function providerText(metrics: SegmentMetrics): string {
	const jev = metrics.providers.jev ?? 0;
	const openai = metrics.providers.openai ?? 0;
	if (jev > 0 && openai === 0 && metrics.fallbackCount === 0) return "JEV (TypeSafe)";
	if (jev === 0 && openai > 0) return "OpenAI Decisions (respaldo; JEV no configurado)";
	return `JEV ${jev} · OpenAI ${openai} (respaldos: ${metrics.fallbackCount})`;
}

function TechDetail({ metrics }: { metrics: SegmentMetrics }) {
	const facts = [
		{
			label: "Acierto sobre los que 30X sí asignó programa",
			value: formatPercent(metrics.accuracyWithProgram),
		},
		{
			label: "Acierto de la primera opción de la IA (sin umbral)",
			value: formatPercent(metrics.engineChoiceAccuracy),
		},
		{
			label: "“Listo para asesor” vs. afinidad alta o muy alta de 30X",
			value: formatPercent(metrics.affinityAgreement),
		},
		{
			label: "De los marcados listos, con afinidad alta según 30X",
			value: formatPercent(metrics.readyPrecision),
		},
		{ label: "Respuesta promedio por inscrito", value: `${Math.round(metrics.avgLatencyMs)} ms` },
		{ label: "Costo del lote", value: formatUsd(metrics.totalCostUsd) },
		{ label: "Quién respondió", value: providerText(metrics) },
		{ label: "Sin respuesta (a revisión humana)", value: String(metrics.failed) },
	];
	return (
		<details className="group rounded-card border border-line p-5">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
				Ver detalle técnico
				<ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
			</summary>
			<div className="mt-4 grid gap-6 lg:grid-cols-2">
				<dl className="grid gap-2 text-sm">
					{facts.map((fact) => (
						<div key={fact.label} className="flex justify-between gap-4 border-b border-line pb-2">
							<dt className="text-ink-muted">{fact.label}</dt>
							<dd className="text-right font-mono text-xs tabular-nums">{fact.value}</dd>
						</div>
					))}
				</dl>
				<table className="w-full text-sm">
					<caption className="mb-2 text-left text-ink-muted">
						Acierto por programa sugerido por 30X
					</caption>
					<thead>
						<tr className="text-left text-xs text-ink-muted">
							<th scope="col" className="pb-2 font-normal">
								Programa
							</th>
							<th scope="col" className="pb-2 text-right font-normal">
								Aciertos
							</th>
							<th scope="col" className="pb-2 text-right font-normal">
								%
							</th>
						</tr>
					</thead>
					<tbody>
						{metrics.byProgram.map((entry) => (
							<tr key={entry.program} className="border-t border-line">
								<th scope="row" className="py-1.5 text-left font-normal">
									{entry.program === "none"
										? "Sin programa sugerido"
										: PROGRAM_LABEL[entry.program]}
								</th>
								<td className="py-1.5 text-right tabular-nums">
									{entry.correct}/{entry.total}
								</td>
								<td className="py-1.5 text-right tabular-nums">{formatPercent(entry.accuracy)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</details>
	);
}

function ProfileRow({ row }: { row: SegmentedRow }) {
	const [changing, setChanging] = useState(false);
	const expected =
		row.expected.program === "none" ? "Sin programa sugerido" : PROGRAM_LABEL[row.expected.program];
	return (
		<li className="grid gap-4 rounded-card border border-line p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
			<div className="grid content-start gap-1.5">
				<p className="text-xs text-ink-muted">{row.id}</p>
				<p className="text-sm font-medium">{whoLine(row.profile)}</p>
				<p className="text-sm">
					Quiere: {row.profile.objetivo}
					{isKnown(row.profile.dolor) ? ` · Le duele: ${row.profile.dolor.toLowerCase()}` : ""}
				</p>
				<p className="text-xs text-ink-muted">Temas: {topicsLine(row.profile)}</p>
			</div>
			<div className="grid content-start gap-3">
				<SegmentSummary result={row.result} />
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p
						className={`inline-flex items-center gap-1.5 text-xs ${row.matches ? "text-approve-ink" : "text-ink-muted"}`}
					>
						{row.matches ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
						{row.matches ? "Coincide con 30X" : `30X sugiere: ${expected}`}
					</p>
					{changing ? null : (
						<button type="button" className={ghostButton} onClick={() => setChanging(true)}>
							Cambió su situación
						</button>
					)}
				</div>
			</div>
			{changing ? (
				<div className="lg:col-span-2">
					<RecalculatePanel profile={row.profile} onClose={() => setChanging(false)} />
				</div>
			) : null}
		</li>
	);
}

/** /segmentos: segment 30X's sample sign-ups, a live "Nuevo inscrito" and recalculation. */
export function SegmentsView() {
	const [data, setData] = useState<SegmentBatchResponse | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");

	async function onRun() {
		setPending(true);
		setError(null);
		try {
			setData(await runSegmentBatch(SAMPLE_SIZE));
			setFilter("all");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "No pudimos segmentar los inscritos.");
		} finally {
			setPending(false);
		}
	}

	const metrics = data?.metrics;
	const rows = data?.rows ?? [];
	const matches = rows.filter((row) => row.matches).length;
	const visible = rows.filter((row) =>
		filter === "all" ? true : filter === "match" ? row.matches : !row.matches,
	);

	return (
		<>
			<PageHeader
				title="Inscritos de Luma"
				description="Idea n.° 1 de 30X con el mismo motor de decisión: cada persona que se inscribe queda en un segmento según su perfil y el momento de su empresa, se recalcula cuando cambia su situación y el sistema dice qué programa ofrecerle."
				actions={
					<button
						type="button"
						className={primaryButton}
						onClick={() => void onRun()}
						disabled={pending}
						aria-busy={pending}
					>
						<SparkleIcon size={18} />
						{pending ? "Segmentando…" : `Segmentar ${SAMPLE_SIZE} inscritos de ejemplo`}
					</button>
				}
			/>

			<div className="grid gap-8">
				{error ? (
					<p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
						{error}
					</p>
				) : null}

				{metrics ? (
					<section aria-label="Resultado del lote" className="grid gap-4">
						<HighlightRow label="Resumen de la segmentación">
							<HighlightCard
								tone="lilac"
								label="Coincide con el programa que sugiere 30X"
								value={formatPercent(metrics.accuracy)}
								note={`${matches} de ${metrics.total}`}
								icon={<CheckIcon size={18} />}
							/>
							<HighlightCard
								tone="aqua"
								label="Listos para hablar con un asesor"
								value={formatPercent(metrics.advisorRate)}
								note={`${metrics.actions.ADVISOR} personas`}
								icon={<SparkleIcon size={18} />}
							/>
							<HighlightCard
								tone="plain"
								label="Tiempo para todo el lote"
								value={secondsText(metrics.wallMs)}
								note={costNote(metrics.totalCostUsd, metrics.total)}
								icon={<ClockIcon size={18} />}
							/>
						</HighlightRow>
						<p className="text-xs text-ink-muted">
							{(Object.keys(ACTION_LABEL) as NextAction[])
								.map((action) => `${ACTION_LABEL[action]}: ${metrics.actions[action]}`)
								.join(" · ")}
						</p>
						<TechDetail metrics={metrics} />
					</section>
				) : (
					<EmptyState title="Aún no segmentas a nadie">
						<p>
							Usa {SAMPLE_SIZE} perfiles anónimos que compartió 30X. La IA solo ve lo que alguien
							deja al inscribirse (rol, país, dolor, objetivo y temas) y comparamos su propuesta con
							el programa que 30X les sugirió.
						</p>
					</EmptyState>
				)}

				<NewLeadForm />

				{rows.length > 0 ? (
					<section aria-labelledby="segmented-list" className="grid gap-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 id="segmented-list" className="text-xl font-normal">
								Inscritos segmentados
							</h2>
							<PillTabs
								label="Filtrar inscritos"
								mode="filter"
								value={filter}
								onChange={setFilter}
								tabs={[
									{ value: "all", label: "Todos", count: rows.length },
									{ value: "match", label: "Coinciden con 30X", count: matches },
									{ value: "miss", label: "No coinciden", count: rows.length - matches },
								]}
							/>
						</div>
						<ul className="grid gap-3">
							{visible.map((row) => (
								<ProfileRow key={row.id} row={row} />
							))}
						</ul>
					</section>
				) : null}
			</div>
		</>
	);
}
