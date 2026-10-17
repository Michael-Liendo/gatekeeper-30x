import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description: string;
	actions?: ReactNode;
}

/** Title row shared by every section of the editor app. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<header className="mb-6 flex flex-wrap items-end justify-between gap-4">
			<div className="grid max-w-2xl gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				<p className="text-sm text-ink-muted">{description}</p>
			</div>
			{actions}
		</header>
	);
}
