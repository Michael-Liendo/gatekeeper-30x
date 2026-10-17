"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { linkButton, primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import type { BrandProfileInput } from "../domain/brand-profile";
import { extractBrand, saveBrand } from "./brand-api";
import { BrandForm } from "./brand-form";
import {
	type BrandFormErrors,
	EMPTY_BRAND_INPUT,
	MAX_LINKS,
	mergeDraft,
	normalizeBrandInput,
	normalizeUrl,
	primaryColor,
	validateBrandInput,
} from "./brand-input";
import { brandStyle } from "./brand-style";
import { BrandSummary } from "./brand-summary";
import { ExtractingStatus } from "./extracting-status";
import { StepIndicator } from "./step-indicator";

const STEPS = ["Tu marca en la web", "Revisa tu marca", "Listo"] as const;

const URL_FIELDS = [
	{ label: "Sitio web", placeholder: "tumarca.com", optional: false },
	{
		label: "Instagram / LinkedIn (opcional)",
		placeholder: "instagram.com/tumarca",
		optional: true,
	},
	{ label: "Otro enlace (opcional)", placeholder: "linkedin.com/company/tumarca", optional: true },
] as const;

const STEP_INTRO = [
	"Pega los enlaces de tu marca y armamos tu perfil editorial en segundos.",
	"Esto es lo que entendimos. Corrige lo que haga falta: el gatekeeper juzga cada pieza con estas reglas.",
	"Así queda tu marca. Puedes cambiarla cuando quieras desde «Mi marca».",
];

/** First-run flow: links → extracted draft → editable form → confirm and save. */
export function OnboardingWizard() {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [urls, setUrls] = useState<string[]>(["", "", ""]);
	const [urlError, setUrlError] = useState<string | null>(null);
	const [extracting, setExtracting] = useState(false);
	const [extractError, setExtractError] = useState<string | null>(null);
	const [input, setInput] = useState<BrandProfileInput>(EMPTY_BRAND_INPUT);
	const [warnings, setWarnings] = useState<string[]>([]);
	const [errors, setErrors] = useState<BrandFormErrors>({});
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);

	// Move focus to the new step's heading so keyboard and screen reader users follow along.
	function goTo(next: number) {
		setStep(next);
		window.requestAnimationFrame(() => {
			headingRef.current?.focus();
			window.scrollTo({ top: 0 });
		});
	}

	function validLinks(): string[] | null {
		const links: string[] = [];
		for (const raw of urls) {
			if (raw.trim() === "") continue;
			const url = normalizeUrl(raw);
			if (!url) return null;
			links.push(url);
		}
		return links.slice(0, MAX_LINKS);
	}

	async function analyze(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const links = validLinks();
		if (links === null) {
			setUrlError("Revisa los enlaces: alguno no parece una dirección web.");
			return;
		}
		if (links.length === 0) {
			setUrlError("Pega al menos el enlace de tu sitio web.");
			return;
		}
		setUrlError(null);
		setExtractError(null);
		setExtracting(true);
		try {
			const draft = await extractBrand(links);
			setInput(mergeDraft(draft, { ...EMPTY_BRAND_INPUT, links }));
			setWarnings(draft.warnings ?? []);
			setErrors({});
			goTo(1);
		} catch (error) {
			setExtractError(
				error instanceof Error ? error.message : "No pudimos analizar tu marca esta vez.",
			);
		} finally {
			setExtracting(false);
		}
	}

	function fillManually() {
		const links = validLinks() ?? [];
		setInput({ ...EMPTY_BRAND_INPUT, links });
		setWarnings([]);
		setErrors({});
		goTo(1);
	}

	function review() {
		const next = validateBrandInput(input);
		setErrors(next);
		if (Object.keys(next).length === 0) goTo(2);
	}

	async function finish() {
		setSaving(true);
		setSaveError(null);
		try {
			await saveBrand(normalizeBrandInput(input));
			router.replace("/");
		} catch (error) {
			setSaving(false);
			setSaveError(error instanceof Error ? error.message : "No pudimos guardar tu marca.");
		}
	}

	return (
		<div className="grid gap-6" style={step > 0 ? brandStyle(primaryColor(input)) : undefined}>
			<p className="text-sm font-semibold">Gatekeeper Editorial</p>
			<StepIndicator steps={STEPS} current={step} />

			<header className="grid gap-1">
				<h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight">
					{STEPS[step]}
				</h1>
				<p className="text-sm text-ink-muted">{STEP_INTRO[step]}</p>
			</header>

			{step === 0 ? (
				<form
					onSubmit={(event) => void analyze(event)}
					noValidate
					aria-busy={extracting}
					className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:p-6"
				>
					{URL_FIELDS.map((field, index) => (
						<div key={field.label} className="grid gap-1.5">
							<label htmlFor={`brand-url-${index}`} className="text-sm font-medium">
								{field.label}
							</label>
							<input
								id={`brand-url-${index}`}
								type="url"
								inputMode="url"
								autoComplete={index === 0 ? "url" : "off"}
								required={!field.optional}
								value={urls[index]}
								onChange={(event) =>
									setUrls(urls.map((url, i) => (i === index ? event.target.value : url)))
								}
								placeholder={field.placeholder}
								disabled={extracting}
								aria-invalid={urlError ? true : undefined}
								aria-describedby={urlError ? "brand-url-error" : undefined}
								className="min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base sm:text-sm"
							/>
						</div>
					))}

					<div aria-live="polite" className="grid gap-3 empty:hidden">
						{extracting ? <ExtractingStatus /> : null}
						{urlError ? (
							<p id="brand-url-error" className="text-sm text-danger">
								{urlError}
							</p>
						) : null}
						{extractError ? (
							<div className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
								<p>{extractError}</p>
								<p className="mt-1 text-ink">
									Puedes intentarlo de nuevo o llenar el perfil a mano con los enlaces que pegaste.
								</p>
							</div>
						) : null}
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<button type="submit" disabled={extracting} className={primaryButton}>
							{extracting ? "Analizando…" : "Analizar mi marca"}
						</button>
						<button
							type="button"
							onClick={fillManually}
							disabled={extracting}
							className={linkButton}
						>
							Prefiero llenarlo a mano
						</button>
					</div>
				</form>
			) : null}

			{step === 1 ? (
				<BrandForm
					value={input}
					onChange={(next) => {
						setInput(next);
						if (Object.keys(errors).length > 0) setErrors(validateBrandInput(next));
					}}
					onSubmit={review}
					errors={errors}
					warnings={warnings}
					actions={
						<>
							<button type="submit" className={primaryButton}>
								Continuar
							</button>
							<button type="button" onClick={() => goTo(0)} className={secondaryButton}>
								Atrás
							</button>
						</>
					}
				/>
			) : null}

			{step === 2 ? (
				<div className="grid gap-5">
					<BrandSummary brand={input} />
					<div aria-live="polite" className="empty:hidden">
						{saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={() => void finish()}
							disabled={saving}
							aria-busy={saving}
							className={primaryButton}
						>
							{saving ? "Guardando tu marca…" : "Entrar a mi bandeja"}
						</button>
						<button
							type="button"
							onClick={() => goTo(1)}
							disabled={saving}
							className={secondaryButton}
						>
							Editar
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
