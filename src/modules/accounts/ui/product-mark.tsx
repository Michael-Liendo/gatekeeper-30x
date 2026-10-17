/** Gatekeeper Editorial mark: a black rounded square with a fine check. */
export function ProductMark({ className = "" }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={`inline-grid size-10 shrink-0 place-items-center rounded-2xl bg-ink text-surface ${className}`}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				className="size-5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M5 12.5l4.2 4.2L19 7" />
			</svg>
		</span>
	);
}
