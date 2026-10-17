"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { softInput } from "./button-styles";

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

	const chipStyle = tone === "danger" ? "bg-danger-soft text-danger" : "bg-pill text-pill-ink";
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

	return (
		<div className="grid gap-2">
			<label htmlFor={id} className="text-sm font-medium text-ink">
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
							className={`inline-flex max-w-full items-center gap-0.5 rounded-full py-1 pr-1 pl-3.5 text-sm ${chipStyle}`}
						>
							<span className="min-w-0 truncate">{value}</span>
							<button
								type="button"
								onClick={() => onChange(values.filter((item) => item !== value))}
								aria-label={`Quitar ${value}`}
								className="grid size-7 shrink-0 place-items-center rounded-full opacity-60 hover:bg-surface hover:opacity-100"
							>
								<svg
									aria-hidden="true"
									viewBox="0 0 16 16"
									className="size-3.5"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								>
									<path d="M4 4l8 8M12 4l-8 8" />
								</svg>
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
					className={`${softInput} min-w-0 flex-1`}
				/>
				<button
					type="button"
					onClick={add}
					disabled={draft.trim() === ""}
					className="min-h-11 shrink-0 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-40"
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
