"use client";

import { useEffect, useId, useState } from "react";
import { RefreshIcon } from "@/shared/ui/icons";
import { useReview } from "./review-session-provider";

/** Ticks while the review runs so the wait reads as progress, not a freeze. */
function useElapsed(running: boolean): number {
	const [elapsed, setElapsed] = useState(0);
	useEffect(() => {
		if (!running) return;
		const startedAt = performance.now();
		setElapsed(0);
		const timer = window.setInterval(() => setElapsed(performance.now() - startedAt), 250);
		return () => window.clearInterval(timer);
	}, [running]);
	return elapsed;
}

interface AnalyzeButtonProps {
	/** "icon": black rounded square for page headers; "full": labeled pill with its explanation. */
	variant?: "icon" | "full";
	className?: string;
}

/** Reviews the 30X sample content (POST /api/review). */
export function AnalyzeButton({ variant = "full", className = "" }: AnalyzeButtonProps) {
	const { status, pieces, run } = useReview();
	const hintId = useId();
	const running = status === "running";
	const elapsed = useElapsed(running);
	const count = pieces.length > 0 ? pieces.length : 45;
	const seconds = Math.max(1, Math.round(elapsed / 1000));

	const label = running
		? `Revisando… ${seconds} s`
		: status === "ready"
			? "Volver a revisar el contenido de ejemplo"
			: "Revisar contenido de ejemplo";
	const hint = `Usa ${count} piezas de ejemplo de 30X.`;

	if (variant === "icon") {
		return (
			<span className={`group relative inline-flex ${className}`}>
				<button
					type="button"
					onClick={() => void run()}
					disabled={running}
					aria-busy={running}
					aria-label={running ? label : `${label}. ${hint}`}
					className={`inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary text-sm text-primary-ink tabular-nums hover:opacity-90 disabled:cursor-progress ${running ? "w-auto px-4" : ""}`}
				>
					<RefreshIcon size={20} className={running ? "motion-safe:animate-spin" : ""} />
					{running ? <span aria-hidden="true">{label}</span> : null}
				</button>
				{running ? null : (
					<span
						role="tooltip"
						className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-56 rounded-xl bg-primary px-3 py-2 text-xs text-primary-ink group-focus-within:block group-hover:block"
					>
						{label}. {hint}
					</span>
				)}
			</span>
		);
	}

	return (
		<div className={`grid justify-items-start gap-2 ${className}`}>
			<button
				type="button"
				onClick={() => void run()}
				disabled={running}
				aria-busy={running}
				aria-describedby={hintId}
				className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-ink tabular-nums hover:opacity-90 disabled:cursor-progress disabled:opacity-80"
			>
				<RefreshIcon size={18} className={running ? "motion-safe:animate-spin" : ""} />
				{label}
			</button>
			<p id={hintId} className="text-xs text-ink-muted">
				{hint}
			</p>
		</div>
	);
}
