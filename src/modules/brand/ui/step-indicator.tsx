interface StepIndicatorProps {
	steps: readonly string[];
	/** Zero-based index of the current step. */
	current: number;
}

/** "Paso 2 de 3" progress bar with the step names. */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
	return (
		<nav aria-label="Progreso" className="grid gap-2">
			<p className="text-xs font-medium text-ink-muted">
				Paso {current + 1} de {steps.length}
			</p>
			<ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
				{steps.map((step, index) => {
					const state = index < current ? "done" : index === current ? "current" : "todo";
					return (
						<li
							key={step}
							aria-current={state === "current" ? "step" : undefined}
							className="grid gap-1.5"
						>
							<span
								aria-hidden="true"
								className={`h-1.5 rounded-full ${state === "todo" ? "bg-line" : "bg-brand"}`}
							/>
							<span
								className={`text-xs ${state === "current" ? "font-semibold text-ink" : "text-ink-muted"}`}
							>
								{step}
								{state === "done" ? <span className="sr-only"> (completado)</span> : null}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
