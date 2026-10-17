"use client";

import type { FormEvent, ReactNode } from "react";
import { ChipInput } from "@/shared/ui/chip-input";
import type { BrandProfileInput } from "../domain/brand-profile";
import { type BrandFormErrors, primaryColor } from "./brand-input";
import { BrandMark } from "./brand-mark";
import { ColorListField } from "./color-list-field";

interface BrandFormProps {
	value: BrandProfileInput;
	onChange: (value: BrandProfileInput) => void;
	onSubmit: () => void;
	errors: BrandFormErrors;
	/** Notes from the extractor about what it could not find. */
	warnings?: string[];
	/** Submit / secondary buttons, rendered at the bottom of the form. */
	actions: ReactNode;
}

const field = "grid gap-1.5";
const label = "text-sm font-medium";
const control =
	"w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-base sm:text-sm aria-invalid:border-danger";

/** The brand profile editor, shared by onboarding (/bienvenida) and settings (/marca). */
export function BrandForm({
	value,
	onChange,
	onSubmit,
	errors,
	warnings,
	actions,
}: BrandFormProps) {
	function set<K extends keyof BrandProfileInput>(key: K, next: BrandProfileInput[K]) {
		onChange({ ...value, [key]: next });
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit();
	}

	const errorCount = Object.keys(errors).length;

	return (
		<form onSubmit={handleSubmit} noValidate className="grid gap-6">
			{warnings && warnings.length > 0 ? (
				<div className="rounded-card border border-human/40 bg-human-soft px-4 py-3 text-sm text-human-ink">
					<p className="font-medium">Revisa estos puntos antes de seguir:</p>
					<ul className="mt-1 list-disc pl-5">
						{warnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</div>
			) : null}

			<section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
				<h2 className="text-base font-semibold">Identidad</h2>
				<div className="flex items-start gap-3">
					<BrandMark
						name={value.name || "?"}
						color={primaryColor(value)}
						logoUrl={value.logoUrl}
						size="lg"
					/>
					<div className={`${field} min-w-0 flex-1`}>
						<label htmlFor="brand-name" className={label}>
							Nombre de la marca
						</label>
						<input
							id="brand-name"
							value={value.name}
							onChange={(event) => set("name", event.target.value)}
							autoComplete="organization"
							aria-invalid={errors.name ? true : undefined}
							aria-describedby={errors.name ? "brand-name-error" : undefined}
							className={control}
						/>
						{errors.name ? (
							<p id="brand-name-error" className="text-xs text-danger">
								{errors.name}
							</p>
						) : null}
					</div>
				</div>
				<div className={field}>
					<label htmlFor="brand-description" className={label}>
						Descripción
					</label>
					<textarea
						id="brand-description"
						value={value.description}
						onChange={(event) => set("description", event.target.value)}
						rows={2}
						placeholder="Qué es tu marca, en una o dos frases."
						className={control}
					/>
				</div>
				<div className={field}>
					<label htmlFor="brand-audience" className={label}>
						Audiencia
					</label>
					<input
						id="brand-audience"
						value={value.audience}
						onChange={(event) => set("audience", event.target.value)}
						placeholder="Ej.: fundadores y ejecutivos de Latinoamérica"
						className={control}
					/>
				</div>
				<ColorListField
					colors={value.colors}
					onChange={(colors) => set("colors", colors)}
					error={errors.colors}
				/>
			</section>

			<section className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
				<h2 className="text-base font-semibold">Qué publica tu marca</h2>
				<ChipInput
					label="Qué vende"
					hint="Productos o servicios reales. El contenido que ofrezca otra cosa se marca para revisión."
					values={value.offerings}
					onChange={(offerings) => set("offerings", offerings)}
					error={errors.offerings}
				/>
				<ChipInput
					label="Temas"
					hint="Los temas de los que habla tu marca."
					values={value.topics}
					onChange={(topics) => set("topics", topics)}
					error={errors.topics}
				/>
				<div className={field}>
					<label htmlFor="brand-tone" className={label}>
						Tono
					</label>
					<textarea
						id="brand-tone"
						value={value.tone}
						onChange={(event) => set("tone", event.target.value)}
						rows={3}
						placeholder="Ej.: directo, cercano, sin promesas exageradas."
						className={control}
					/>
				</div>
				<ChipInput
					label="Temas prohibidos"
					hint="Temas o afirmaciones que tu marca nunca publica."
					values={value.forbidden}
					onChange={(forbidden) => set("forbidden", forbidden)}
					tone="danger"
				/>
				<ChipInput
					label="Enlaces de la marca"
					hint="Sitio web y redes que usamos para analizar tu marca."
					placeholder="https://tumarca.com"
					values={value.links}
					onChange={(links) => set("links", links)}
				/>
			</section>

			<div aria-live="polite" className="empty:hidden">
				{errorCount > 0 ? (
					<p className="text-sm text-danger">
						{errorCount === 1 ? "Falta corregir 1 campo." : `Faltan corregir ${errorCount} campos.`}
					</p>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-3">{actions}</div>
		</form>
	);
}
