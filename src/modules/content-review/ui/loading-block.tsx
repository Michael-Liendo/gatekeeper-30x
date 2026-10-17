/** Placeholder while the saved session is read from the browser. */
export function LoadingBlock() {
	return (
		<div role="status" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
			<span className="sr-only">Cargando…</span>
			{["a", "b", "c"].map((key) => (
				<div
					key={key}
					aria-hidden="true"
					className="h-32 rounded-card bg-surface-muted motion-safe:animate-pulse sm:h-44"
				/>
			))}
		</div>
	);
}
