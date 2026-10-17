import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	children: ReactNode;
	action?: ReactNode;
}

/** Explains what is missing and offers the next step. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
	return (
		<div className="grid justify-items-start gap-3 rounded-card bg-surface-muted p-6 sm:p-10">
			<h2 className="text-xl font-normal">{title}</h2>
			<div className="max-w-prose text-sm leading-relaxed text-ink-muted">{children}</div>
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
