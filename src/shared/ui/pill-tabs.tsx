"use client";

import type { KeyboardEvent } from "react";

export interface PillTab<T extends string> {
	value: T;
	label: string;
	count?: number;
}

interface PillTabsProps<T extends string> {
	tabs: readonly PillTab<T>[];
	value: T;
	onChange: (value: T) => void;
	label: string;
	/** "tabs" for a tablist (with a tabpanel), "filter" for toggle buttons. */
	mode?: "tabs" | "filter";
	className?: string;
}

/** Soft pill switcher: the selected option sits on a mint pill, the rest is plain gray text. */
export function PillTabs<T extends string>({
	tabs,
	value,
	onChange,
	label,
	mode = "tabs",
	className = "",
}: PillTabsProps<T>) {
	const isTabs = mode === "tabs";

	function handleKey(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
		const index = tabs.findIndex((tab) => tab.value === value);
		const step = event.key === "ArrowRight" ? 1 : -1;
		const next = tabs[(index + step + tabs.length) % tabs.length];
		if (!next) return;
		onChange(next.value);
		const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
		buttons[(index + step + tabs.length) % tabs.length]?.focus();
	}

	const pillClass = (selected: boolean) =>
		`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${
			selected ? "bg-pill font-medium text-pill-ink" : "text-ink-muted hover:text-ink"
		}`;
	const content = (tab: PillTab<T>, selected: boolean) => (
		<>
			{tab.label}
			{tab.count !== undefined ? (
				<span className={`text-xs tabular-nums ${selected ? "" : "opacity-70"}`}>{tab.count}</span>
			) : null}
		</>
	);
	const wrapper = `flex min-w-0 gap-1 overflow-x-auto ${className}`;

	if (!isTabs) {
		return (
			<fieldset className={wrapper}>
				<legend className="sr-only">{label}</legend>
				{tabs.map((tab) => {
					const selected = tab.value === value;
					return (
						<button
							key={tab.value}
							type="button"
							aria-pressed={selected}
							onClick={() => onChange(tab.value)}
							className={pillClass(selected)}
						>
							{content(tab, selected)}
						</button>
					);
				})}
			</fieldset>
		);
	}

	return (
		<div role="tablist" aria-label={label} onKeyDown={handleKey} className={wrapper}>
			{tabs.map((tab) => {
				const selected = tab.value === value;
				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						aria-selected={selected}
						tabIndex={selected ? undefined : -1}
						onClick={() => onChange(tab.value)}
						className={pillClass(selected)}
					>
						{content(tab, selected)}
					</button>
				);
			})}
		</div>
	);
}
