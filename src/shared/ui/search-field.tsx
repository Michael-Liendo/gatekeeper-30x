"use client";

import { useId } from "react";
import { SearchIcon } from "./icons";

interface SearchFieldProps {
	value: string;
	onChange: (value: string) => void;
	label: string;
	placeholder?: string;
	className?: string;
}

/** Minimal search: an icon and a single bottom line, label kept for screen readers. */
export function SearchField({
	value,
	onChange,
	label,
	placeholder = "Buscar",
	className = "",
}: SearchFieldProps) {
	const id = useId();
	return (
		<div
			className={`flex min-h-11 min-w-0 items-center gap-2 border-b border-line-strong text-ink-muted focus-within:border-ink focus-within:text-ink ${className}`}
		>
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<SearchIcon size={18} className="shrink-0" />
			<input
				id={id}
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="min-h-11 w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
			/>
		</div>
	);
}
