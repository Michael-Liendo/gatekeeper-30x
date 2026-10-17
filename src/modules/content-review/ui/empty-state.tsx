import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	children: ReactNode;
	action?: ReactNode;
}

/** Explains what is missing and offers the next step. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
	return (
		<div className="grid justify-items-start gap-3 rounded-card border border-dashed border-line-strong bg-surface p-6 sm:p-8">
			<h2 className="text-lg font-semibold">{title}</h2>
			<div className="max-w-prose text-sm leading-relaxed text-ink-muted">{children}</div>
			{action}
		</div>
	);
}
