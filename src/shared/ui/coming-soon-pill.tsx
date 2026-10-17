/** Small "Próximamente" tag for features that are announced but not ready yet. */
export function ComingSoonPill({ className = "" }: { className?: string }) {
	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-full bg-pill px-2 py-0.5 text-[0.6875rem] font-medium text-pill-ink ${className}`}
		>
			Próximamente
		</span>
	);
}
