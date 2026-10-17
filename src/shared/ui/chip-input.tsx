"use client";

import { type KeyboardEvent, useId, useState } from "react";

interface ChipInputProps {
	label: string;
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	hint?: string;
	error?: string;
	/** Visual tone of the chips; "danger" for forbidden topics. */
	tone?: "neutral" | "danger";
}

/** List of short strings edited as removable chips plus an "add" input. */
export function ChipInput({
	label,
	values,
	onChange,
	placeholder = "Escribe y presiona Enter",
	hint,
	error,
	tone = "neutral",
}: ChipInputProps) {
	const id = useId();
	const [draft, setDraft] = useState("");
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;

	function add() {
		const items = draft
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
		if (items.length === 0) return;
		const next = [...values];
		for (const item of items) {
			if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item);
		}
		onChange(next);
		setDraft("");
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			add();
		} else if (event.key === "Backspace" && draft === "" && values.length > 0) {
			onChange(values.slice(0, -1));
		}
	}

	const chipStyle = tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-muted text-ink";
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

	return (
		<div className="grid gap-1.5">
			<label htmlFor={id} className="text-sm font-medium">
				{label}
			</label>
			{hint ? (
				<p id={hintId} className="text-xs text-ink-muted">
					{hint}
				</p>
			) : null}
			{values.length > 0 ? (
				<ul className="flex flex-wrap gap-1.5" aria-label={label}>
					{values.map((value) => (
						<li
							key={value}
							className={`inline-flex max-w-full items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm ${chipStyle}`}
						>
							<span className="min-w-0 truncate">{value}</span>
							<button
								type="button"
								onClick={() => onChange(values.filter((item) => item !== value))}
								aria-label={`Quitar ${value}`}
								className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-line"
							>
								<span aria-hidden="true">×</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
			<div className="flex gap-2">
				<input
					id={id}
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={onKeyDown}
					onBlur={add}
					placeholder={placeholder}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy || undefined}
					className="min-h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm"
				/>
				<button
					type="button"
					onClick={add}
					disabled={draft.trim() === ""}
					className="min-h-11 shrink-0 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
				>
					Agregar
				</button>
			</div>
			{error ? (
				<p id={errorId} className="text-xs text-danger">
					{error}
				</p>
			) : null}
		</div>
	);
}
