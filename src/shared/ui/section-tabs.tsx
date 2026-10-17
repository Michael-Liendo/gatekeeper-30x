import Link from "next/link";

export interface SectionTab<T extends string> {
	id: T;
	label: string;
	href: string;
}

interface SectionTabsProps<T extends string> {
	tabs: readonly SectionTab<T>[];
	/** Id of the current sub-page; passed by the page so no pathname hook is needed. */
	active: T;
	/** Accessible name of the tab row (e.g. "Vistas de contenido"). */
	label: string;
	className?: string;
}

/**
 * Pill links between the sub-pages of one section. Real links (each sub-view is its own
 * route), so Tab/Enter work natively; scrolls sideways on narrow screens.
 */
export function SectionTabs<T extends string>({
	tabs,
	active,
	label,
	className = "",
}: SectionTabsProps<T>) {
	return (
		<nav aria-label={label} className={`-mx-1 mb-6 lg:mb-8 ${className}`}>
			<ul className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{tabs.map((tab) => {
					const selected = tab.id === active;
					return (
						<li key={tab.id} className="shrink-0">
							<Link
								href={tab.href}
								aria-current={selected ? "page" : undefined}
								className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3.5 text-sm sm:px-4 transition-colors ${
									selected
										? "bg-pill font-medium text-pill-ink"
										: "text-ink-muted hover:bg-pill/50 hover:text-ink"
								}`}
							>
								{tab.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
