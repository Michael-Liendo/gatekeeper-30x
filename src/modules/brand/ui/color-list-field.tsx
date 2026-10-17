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

/** 2–4 brand colors as big round swatches; tapping one opens the system color picker. */
export function ColorListField({ colors, onChange, error }: ColorListFieldProps) {
	const id = useId();

	function update(index: number, value: string) {
		onChange(colors.map((color, i) => (i === index ? value : color)));
	}

	return (
		<fieldset className="grid gap-5" aria-describedby={error ? `${id}-error` : `${id}-hint`}>
			<legend className="float-left w-full text-lg font-normal tracking-tight text-ink">
				Colores
			</legend>
			<p id={`${id}-hint`} className="-mt-4 text-xs text-ink-muted">
				Toca un círculo para cambiarlo. El primero es el principal.
			</p>
			<ul className="flex flex-wrap gap-x-4 gap-y-4 sm:gap-x-5">
				{colors.map((color, index) => {
					const valid = isHexColor(color);
					const name = COLOR_NAMES[index] ?? `Color ${index + 1}`;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: colors are positional (first = primary)
						<li key={index} className="relative grid w-16 justify-items-center sm:w-20 gap-2">
							<label
								className="relative block size-16 cursor-pointer rounded-full border border-line-strong/60 transition-transform hover:scale-105 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus sm:size-20"
								style={{ backgroundColor: valid ? color : "#ffffff" }}
							>
								<span className="sr-only">Cambiar color {name.toLowerCase()}</span>
								<input
									type="color"
									value={valid ? color.toLowerCase() : "#000000"}
									onChange={(event) => update(index, event.target.value)}
									className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
								/>
							</label>
							<span className="grid justify-items-center leading-tight">
								<span className="text-xs text-ink">{name}</span>
								<span className="text-[11px] text-ink-muted uppercase">{color}</span>
							</span>
							{colors.length > MIN_COLORS ? (
								<button
									type="button"
									onClick={() => onChange(colors.filter((_, i) => i !== index))}
									aria-label={`Quitar color ${name.toLowerCase()}`}
									className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full border border-line bg-surface text-ink-muted hover:text-ink"
								>
									<svg
										aria-hidden="true"
										viewBox="0 0 16 16"
										className="size-3"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									>
										<path d="M4 4l8 8M12 4l-8 8" />
									</svg>
								</button>
							) : null}
						</li>
					);
				})}
				{colors.length < MAX_COLORS ? (
					<li className="grid w-16 justify-items-center gap-2 sm:w-20">
						<button
							type="button"
							onClick={() => onChange([...colors, "#cccccc"])}
							aria-label="Agregar color"
							className="grid size-16 place-items-center rounded-full border border-line-strong border-dashed text-ink-muted hover:border-ink hover:text-ink sm:size-20"
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								className="size-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							>
								<path d="M12 5v14M5 12h14" />
							</svg>
						</button>
						<span aria-hidden="true" className="text-xs text-ink-muted">
							Agregar
						</span>
					</li>
				) : null}
			</ul>
			{error ? (
				<p id={`${id}-error`} className="text-xs text-danger">
					{error}
				</p>
			) : null}
		</fieldset>
	);
}
