"use client";

import { useId } from "react";
import { isHexColor } from "@/shared/ui/contrast";
import { MAX_COLORS, MIN_COLORS } from "./brand-input";

interface ColorListFieldProps {
	colors: string[];
	onChange: (colors: string[]) => void;
	error?: string;
}

const COLOR_NAMES = ["Principal", "Secundario", "Acento", "Acento 2"];

/** 2–4 brand colors, each with a native picker, a hex text field and a swatch. */
export function ColorListField({ colors, onChange, error }: ColorListFieldProps) {
	const id = useId();

	function update(index: number, value: string) {
		onChange(colors.map((color, i) => (i === index ? value : color)));
	}

	return (
		<fieldset className="grid gap-2" aria-describedby={error ? `${id}-error` : `${id}-hint`}>
			<legend className="text-sm font-medium">Colores</legend>
			<p id={`${id}-hint`} className="text-xs text-ink-muted">
				El primero es el principal: se usa en botones y en la navegación.
			</p>
			<ul className="grid gap-2 sm:grid-cols-2">
				{colors.map((color, index) => {
					const valid = isHexColor(color);
					const label = COLOR_NAMES[index] ?? `Color ${index + 1}`;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: colors are positional (first = primary)
						<li key={index} className="flex items-center gap-2">
							<input
								type="color"
								value={valid ? color.toLowerCase() : "#000000"}
								onChange={(event) => update(index, event.target.value)}
								aria-label={`Elegir color ${label.toLowerCase()}`}
								className="size-11 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-surface p-1"
							/>
							<div className="grid min-w-0 flex-1 gap-0.5">
								<label htmlFor={`${id}-${index}`} className="text-xs text-ink-muted">
									{label}
								</label>
								<input
									id={`${id}-${index}`}
									value={color}
									onChange={(event) => {
										const value = event.target.value.trim();
										update(index, value.startsWith("#") || value === "" ? value : `#${value}`);
									}}
									maxLength={7}
									spellCheck={false}
									aria-invalid={valid ? undefined : true}
									className="min-h-9 w-full rounded-md border border-line-strong bg-surface px-2 font-mono text-sm uppercase aria-invalid:border-danger"
								/>
							</div>
							{colors.length > MIN_COLORS ? (
								<button
									type="button"
									onClick={() => onChange(colors.filter((_, i) => i !== index))}
									aria-label={`Quitar color ${label.toLowerCase()}`}
									className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
								>
									<span aria-hidden="true">×</span>
								</button>
							) : null}
						</li>
					);
				})}
			</ul>
			{colors.length < MAX_COLORS ? (
				<button
					type="button"
					onClick={() => onChange([...colors, "#cccccc"])}
					className="justify-self-start rounded-md text-sm font-medium underline underline-offset-2"
				>
					+ Agregar color
				</button>
			) : null}
			{error ? (
				<p id={`${id}-error`} className="text-xs text-danger">
					{error}
				</p>
			) : null}
		</fieldset>
	);
}
