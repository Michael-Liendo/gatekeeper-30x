/** Small outlined chip that marks a demo example piece (neutral, so it never reads as a status). */
export function ExampleChip() {
	return (
		<span
			title="Pieza de ejemplo para conocer la herramienta"
			className="inline-flex items-center whitespace-nowrap rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted"
		>
			Ejemplo
		</span>
	);
}
