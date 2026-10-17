/** Placeholder while the saved session is read from the browser. */
export function LoadingBlock() {
	return (
		<div
			role="status"
			className="rounded-card border border-line bg-surface p-6 text-sm text-ink-muted"
		>
			Cargando la sesión…
		</div>
	);
}
