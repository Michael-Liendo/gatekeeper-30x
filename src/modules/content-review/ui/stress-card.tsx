"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import { ClockIcon, CoinIcon, SparkleIcon } from "@/shared/ui/icons";
import type { StressReport } from "../application/stress-run";
import { errorMessage, runStressTest } from "./api";
import { formatInteger, formatPercent } from "./format";
import { ROUTE_LABEL, ROUTE_STYLE, ROUTES } from "./labels";

const COUNT = 1000;
const SECONDS_PER_DAY = 86_400;

const LOCALE = "es-ES";
const oneDecimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat(LOCALE, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const significant = new Intl.NumberFormat(LOCALE, { maximumSignificantDigits: 2 });

/** "USD 350", "USD 0,05", "USD 0,0041". */
function usd(value: number): string {
	if (!Number.isFinite(value) || value === 0) return "USD 0";
	if (value >= 100) return `USD ${formatInteger(value)}`;
	if (value >= 0.01) return `USD ${twoDecimals.format(value)}`;
	return `USD ${significant.format(value)}`;
}

/** "12,4 s". */
function seconds(ms: number): string {
	return `${oneDecimal.format(ms / 1000)} s`;
}

/** "7 millones de piezas", "6,9 millones de piezas", "850.000 piezas". */
function piecesCount(value: number): string {
	if (value >= 1_000_000) {
		const millions = value / 1_000_000;
		const text = oneDecimal.format(millions >= 10 ? Math.round(millions) : millions);
		return `${text} ${text === "1" ? "millón" : "millones"} de piezas`;
	}
	return `${formatInteger(value)} piezas`;
}

/** Ticks while the run is in flight so the wait reads as progress. */
function useElapsed(running: boolean): number {
	const [elapsed, setElapsed] = useState(0);
	useEffect(() => {
		if (!running) return;
		const startedAt = performance.now();
		setElapsed(0);
		const timer = window.setInterval(() => setElapsed(performance.now() - startedAt), 100);
		return () => window.clearInterval(timer);
	}, [running]);
	return elapsed;
}

function Stat({ icon, children }: { icon: ReactNode; children: ReactNode }) {
	return (
		<li className="flex items-center gap-3 rounded-[20px] bg-surface px-5 py-4 text-sm">
			<span aria-hidden="true" className="shrink-0">
				{icon}
			</span>
			<span className="min-w-0">{children}</span>
		</li>
	);
}

function RouteSplit({ report }: { report: StressReport }) {
	const total = report.count || 1;
	return (
		<div className="grid gap-3">
			<h3 className="text-sm font-medium">A dónde fueron las piezas</h3>
			<div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-surface">
				{ROUTES.map((route) =>
					report.byRoute[route] > 0 ? (
						<div
							key={route}
							className={`h-full ${ROUTE_STYLE[route].dot}`}
							style={{ width: `${(report.byRoute[route] / total) * 100}%` }}
						/>
					) : null,
				)}
			</div>
			<ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
				{ROUTES.map((route) => (
					<li key={route} className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className={`size-2.5 rounded-full ${ROUTE_STYLE[route].dot}`}
						/>
						{ROUTE_LABEL[route]}:{" "}
						<span className="tabular-nums">
							{formatInteger(report.byRoute[route])} ({formatPercent(report.byRoute[route] / total)}
							)
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function providerLine(report: StressReport): string {
	const parts = [];
	const jevDirect = report.providers.jev;
	const openaiDirect = report.providers.openai - report.fallbackCount;
	if (jevDirect > 0) parts.push(`JEV respondió ${formatInteger(jevDirect)}`);
	if (report.fallbackCount > 0)
		parts.push(`OpenAI respondió ${formatInteger(report.fallbackCount)} como respaldo`);
	if (openaiDirect > 0) parts.push(`OpenAI respondió ${formatInteger(openaiDirect)}`);
	if (report.failures > 0)
		parts.push(`${formatInteger(report.failures)} sin respuesta (irían a revisión humana)`);
	return parts.join(" · ");
}

function Results({ report }: { report: StressReport }) {
	const perDay = report.decisionsPerSecond * SECONDS_PER_DAY;
	const costPerDay = (perDay / 1000) * report.costPer1kUsd;

	return (
		<div className="grid gap-6">
			<p className="text-3xl font-light leading-tight tabular-nums sm:text-4xl">
				{formatInteger(report.count)} decisiones en {seconds(report.totalMs)}
			</p>
			{report.partial ? (
				<p className="text-sm text-ink-muted">
					Cortamos a los 55 segundos: se completaron {formatInteger(report.count)} de{" "}
					{formatInteger(report.requested)}.
				</p>
			) : null}

			<ul className="grid gap-3 sm:grid-cols-3">
				<Stat icon={<SparkleIcon size={20} />}>
					<span className="tabular-nums">
						{formatInteger(Math.round(report.decisionsPerSecond))}
					</span>{" "}
					decisiones por segundo
				</Stat>
				<Stat icon={<CoinIcon size={20} />}>
					Costo total: {usd(report.totalCostUsd)} (≈ {usd(report.costPer1kUsd)} por cada 1.000)
				</Stat>
				<Stat icon={<ClockIcon size={20} />}>
					Cada decisión: {formatInteger(report.p50Ms)} ms (p95 {formatInteger(report.p95Ms)} ms)
				</Stat>
			</ul>

			<RouteSplit report={report} />

			<div className="grid gap-1 rounded-[20px] border border-line bg-surface px-5 py-4">
				<span className="text-xs text-ink-muted">Proyección con lo medido</span>
				<p className="text-sm">
					A este ritmo, 30X podría revisar ~{piecesCount(perDay)} al día por ~{usd(costPerDay)}.
				</p>
			</div>

			<p className="text-xs text-ink-muted">{providerLine(report)}</p>
		</div>
	);
}

/** "Prueba de escala": runs 1.000 real decisions and shows speed and cost in plain words. */
export function StressCard() {
	const [running, setRunning] = useState(false);
	const [report, setReport] = useState<StressReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const elapsed = useElapsed(running);
	const titleId = useId();
	const hintId = useId();

	async function run() {
		setRunning(true);
		setError(null);
		try {
			setReport(await runStressTest(COUNT));
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setRunning(false);
		}
	}

	return (
		<section
			aria-labelledby={titleId}
			className="grid gap-6 rounded-card bg-surface-muted p-6 sm:p-8"
		>
			<div className="grid gap-2">
				<h2 id={titleId} className="text-xl font-normal sm:text-2xl">
					Prueba de escala: 1.000 decisiones reales
				</h2>
				<p id={hintId} className="max-w-prose text-sm leading-relaxed text-ink-muted">
					JEV decide 1.000 piezas de verdad, en paralelo y sin respuestas guardadas. Solo texto, sin
					imágenes, para que sea rápido y barato. Tarda menos de un minuto.
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-4">
				<button
					type="button"
					onClick={() => void run()}
					disabled={running}
					aria-busy={running}
					aria-describedby={hintId}
					className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-ink tabular-nums hover:opacity-90 disabled:cursor-progress disabled:opacity-80"
				>
					{running ? `Decidiendo… ${seconds(elapsed)}` : "Correr 1.000 decisiones"}
				</button>
				{running ? (
					<span className="text-sm text-ink-muted">Esto puede tardar hasta un minuto.</span>
				) : null}
			</div>

			<div aria-live="polite" aria-atomic="true" className="grid gap-4">
				{error ? (
					<p className="rounded-[20px] bg-danger-soft px-5 py-4 text-sm text-danger">{error}</p>
				) : null}
				{report && !running ? <Results report={report} /> : null}
			</div>
		</section>
	);
}
