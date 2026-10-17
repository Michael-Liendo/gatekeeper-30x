import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description: string;
	actions?: ReactNode;
	className?: string;
}

/** Large light title, short gray subtitle and optional tools on the right. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
	return (
		<header
			className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 ${
				className ?? "mb-8 lg:mb-10"
			}`}
		>
			<div className="grid max-w-xl gap-1.5">
				<h1 className="text-balance text-[1.875rem] font-normal leading-[1.15] tracking-[-0.01em] sm:text-[2.25rem]">
					{title}
				</h1>
				<p className="max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p>
			</div>
			{actions ? <div className="flex w-full items-end gap-3 sm:w-auto">{actions}</div> : null}
		</header>
	);
}
