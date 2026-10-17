"use client";

import { useEffect, useState } from "react";
import { formatSeconds } from "./format";
import { useReview } from "./review-session-provider";

/** Ticks while the analysis runs so the wait reads as progress, not a freeze. */
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

interface AnalyzeButtonProps {
	className?: string;
}

/** Runs the gatekeeper over the whole dataset (POST /api/review). */
export function AnalyzeButton({ className = "" }: AnalyzeButtonProps) {
	const { status, pieces, run } = useReview();
	const running = status === "running";
	const elapsed = useElapsed(running);
	const count = pieces.length > 0 ? pieces.length : 45;

	let label = `Analizar contenido (${count})`;
	if (running) label = `Analizando… ${formatSeconds(elapsed)}`;
	else if (status === "ready") label = "Volver a analizar";

	return (
		<button
			type="button"
			onClick={() => void run()}
			disabled={running}
			aria-busy={running}
			className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-ink tabular-nums hover:opacity-90 disabled:cursor-progress disabled:opacity-80 ${className}`}
		>
			{label}
		</button>
	);
}
