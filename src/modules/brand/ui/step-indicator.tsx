interface StepIndicatorProps {
	steps: readonly string[];
	/** Zero-based index of the current step. */
	current: number;
}

/** Steps as pills: the current one filled with the soft pill color, done ones with a check. */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
	return (
		<nav aria-label="Progreso">
			<p className="sr-only">
				Paso {current + 1} de {steps.length}
			</p>
			<ol className="flex flex-wrap items-center gap-1">
				{steps.map((step, index) => {
					const state = index < current ? "done" : index === current ? "current" : "todo";
					return (
						<li
							key={step}
							aria-current={state === "current" ? "step" : undefined}
							className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm ${
								state === "current" ? "bg-pill font-medium text-pill-ink" : "text-ink-muted"
							}`}
						>
							<span
								aria-hidden="true"
								className={`grid size-5 place-items-center rounded-full text-[11px] ${
									state === "todo" ? "border border-line-strong" : "bg-ink text-surface"
								}`}
							>
								{state === "done" ? (
									<svg
										aria-hidden="true"
										viewBox="0 0 16 16"
										className="size-3"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.75"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M3.5 8.5l3 3 6-7" />
									</svg>
								) : (
									index + 1
								)}
							</span>
							<span className={state === "current" ? "" : "max-sm:sr-only"}>{step}</span>
							{state === "done" ? <span className="sr-only"> (completado)</span> : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
