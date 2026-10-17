"use client";

import { useId } from "react";

interface SliderFieldProps {
	label: string;
	description: string;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	/** Reference value; shown when the current value differs from it. */
	defaultValue?: number;
	format: (value: number) => string;
	onChange: (value: number) => void;
}

/** Labeled range input with its formatted value and an accessible description. */
export function SliderField({
	label,
	description,
	value,
	min = 0,
	max = 1,
	step = 0.01,
	defaultValue,
	format,
	onChange,
}: SliderFieldProps) {
	const id = useId();
	const descriptionId = `${id}-description`;
	const changed = defaultValue !== undefined && Math.abs(defaultValue - value) > 1e-9;

	return (
		<div className="grid gap-1.5">
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-semibold">
					{label}
				</label>
				<output htmlFor={id} className="font-mono text-sm font-semibold tabular-nums">
					{format(value)}
				</output>
			</div>
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				aria-describedby={descriptionId}
				aria-valuetext={format(value)}
				onChange={(event) => onChange(Number(event.target.value))}
				className="h-11 w-full cursor-pointer accent-ink"
			/>
			<p id={descriptionId} className="text-xs leading-relaxed text-ink-muted">
				{description}
				{changed && defaultValue !== undefined ? (
					<span className="text-ink"> Por defecto: {format(defaultValue)}.</span>
				) : null}
			</p>
		</div>
	);
}
