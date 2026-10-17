"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { softInput } from "@/shared/ui/button-styles";
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
	/** Notes about what we could not read from the brand's pages; shown as one friendly line. */
	warnings?: string[];
	/** Submit / secondary buttons, rendered at the bottom of the form. */
	actions: ReactNode;
}

const field = "grid gap-2";
const label = "text-sm font-medium text-ink";
const hintText = "text-xs text-ink-muted";
const card = "grid gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-7";
const cardTitle = "text-lg font-normal tracking-tight text-ink";

function CardHeader({ id, title, hint }: { id: string; title: string; hint?: string }) {
	return (
		<div className="grid gap-1">
			<h2 id={id} className={cardTitle}>
				{title}
			</h2>
			{hint ? <p className={hintText}>{hint}</p> : null}
		</div>
	);
}

/** The brand profile editor, shared by onboarding (/bienvenida) and settings (/marca). */
export function BrandForm({
	value,
	onChange,
	onSubmit,
	errors,
	warnings,
	actions,
}: BrandFormProps) {
	const [moreOpen, setMoreOpen] = useState(false);
	// Topics are required and live under "Más detalles": open it when they need attention.
	const detailsOpen = moreOpen || Boolean(errors.topics);

	function set<K extends keyof BrandProfileInput>(key: K, next: BrandProfileInput[K]) {
		onChange({ ...value, [key]: next });
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit();
	}

	const errorCount = Object.keys(errors).length;

	return (
		<form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:gap-5">
			{warnings && warnings.length > 0 ? (
				<p className="flex items-start gap-3 rounded-[var(--radius-card)] bg-human-soft px-5 py-4 text-sm text-human-ink">
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						className="mt-0.5 size-4 shrink-0"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					>
						<circle cx="12" cy="12" r="9" />
						<path d="M12 8v5M12 16.5v.01" />
					</svg>
					No pudimos leer todo tu sitio; completa lo que falte.
				</p>
			) : null}

			<section aria-labelledby="brand-card-identity" className={card}>
				<div className="flex items-center gap-4">
					<BrandMark
						name={value.name || "?"}
						color={primaryColor(value)}
						logoUrl={value.logoUrl}
						size="lg"
					/>
					<div className={`${field} min-w-0 flex-1`}>
						<label id="brand-card-identity" htmlFor="brand-name" className={label}>
							Nombre de tu marca
						</label>
						<input
							id="brand-name"
							value={value.name}
							onChange={(event) => set("name", event.target.value)}
							autoComplete="organization"
							placeholder="Ej.: Café Altura"
							aria-invalid={errors.name ? true : undefined}
							aria-describedby={errors.name ? "brand-name-error" : undefined}
							className={softInput}
						/>
						{errors.name ? (
							<p id="brand-name-error" className="text-xs text-danger">
								{errors.name}
							</p>
						) : null}
					</div>
				</div>
			</section>

			<section aria-labelledby="brand-card-offer" className={card}>
				<h2 id="brand-card-offer" className={cardTitle}>
					Qué vendes y para quién
				</h2>
				<ChipInput
					label="Qué vendes"
					hint="Tus productos o servicios. Si una pieza ofrece otra cosa, te la mostramos para revisar."
					placeholder="Ej.: café de especialidad"
					values={value.offerings}
					onChange={(offerings) => set("offerings", offerings)}
					error={errors.offerings}
				/>
				<div className={field}>
					<label htmlFor="brand-audience" className={label}>
						Para quién
					</label>
					<input
						id="brand-audience"
						value={value.audience}
						onChange={(event) => set("audience", event.target.value)}
						placeholder="Ej.: amantes del café en Lima"
						className={softInput}
					/>
				</div>
			</section>

			<section aria-labelledby="brand-card-voice" className={card}>
				<CardHeader
					id="brand-card-voice"
					title="Cómo habla tu marca"
					hint="Tu tono en pocas palabras. Lo usamos para revisar y ajustar cada pieza."
				/>
				<div className={field}>
					<label htmlFor="brand-tone" className="sr-only">
						Tono
					</label>
					<textarea
						id="brand-tone"
						value={value.tone}
						onChange={(event) => set("tone", event.target.value)}
						rows={3}
						placeholder="Ej.: cercano, alegre, sin promesas exageradas."
						className={`${softInput} resize-y`}
					/>
				</div>
			</section>

			<section className={card}>
				<ColorListField
					colors={value.colors}
					onChange={(colors) => set("colors", colors)}
					error={errors.colors}
				/>
			</section>

			<details
				open={detailsOpen}
				onToggle={(event) => setMoreOpen(event.currentTarget.open)}
				className="group rounded-[var(--radius-card)] border border-line bg-surface"
			>
				<summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 py-4 sm:px-7 [&::-webkit-details-marker]:hidden">
					<span className="grid gap-0.5">
						<span className={cardTitle}>Más detalles</span>
						<span className={hintText}>Temas, lo que nunca publicas, descripción y logo.</span>
					</span>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M6 9l6 6 6-6" />
					</svg>
				</summary>
				<div className="grid gap-6 px-5 pt-1 pb-6 sm:px-7 sm:pb-7">
					<ChipInput
						label="Temas"
						hint="De qué habla tu marca. Empezamos con lo que vendes."
						placeholder="Ej.: recetas"
						values={value.topics}
						onChange={(topics) => set("topics", topics)}
						error={errors.topics}
					/>
					<ChipInput
						label="Temas prohibidos"
						hint="Lo que tu marca nunca publica."
						placeholder="Ej.: política"
						values={value.forbidden}
						onChange={(forbidden) => set("forbidden", forbidden)}
						tone="danger"
					/>
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
							className={`${softInput} resize-y`}
						/>
					</div>
					<div className={field}>
						<label htmlFor="brand-logo" className={label}>
							Logo
						</label>
						<p id="brand-logo-hint" className={hintText}>
							Pega el enlace de la imagen de tu logo.
						</p>
						<input
							id="brand-logo"
							type="url"
							inputMode="url"
							value={value.logoUrl ?? ""}
							onChange={(event) => set("logoUrl", event.target.value || undefined)}
							placeholder="tumarca.com/logo.png"
							aria-describedby="brand-logo-hint"
							className={softInput}
						/>
					</div>
					<ChipInput
						label="Tus páginas"
						hint="Tu página web y redes. Las usamos para conocer tu marca."
						placeholder="tumarca.com"
						values={value.links}
						onChange={(links) => set("links", links)}
					/>
				</div>
			</details>

			<div aria-live="polite" className="empty:hidden">
				{errorCount > 0 ? (
					<p className="px-1 text-sm text-danger">
						{errorCount === 1
							? "Falta completar 1 campo."
							: `Faltan completar ${errorCount} campos.`}
					</p>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-3 pt-2">{actions}</div>
		</form>
	);
}
