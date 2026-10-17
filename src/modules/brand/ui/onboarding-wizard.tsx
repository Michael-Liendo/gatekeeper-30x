"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { ProductMark } from "@/modules/accounts/ui/product-mark";
import {
	ghostButton,
	linkButton,
	primaryButtonLarge,
	underlineInput,
} from "@/shared/ui/button-styles";
import { contrastRatio, INK_LIGHT } from "@/shared/ui/contrast";
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
	withDefaults,
} from "./brand-input";
import { brandStyle } from "./brand-style";
import { BrandSummary } from "./brand-summary";
import { ExtractingStatus } from "./extracting-status";
import { StepIndicator } from "./step-indicator";

const STEPS = ["Tu página", "Tu marca", "Listo"] as const;

const STEP_TITLES = [
	"Empecemos por tu página web",
	"Esto es lo que encontramos",
	"¡Todo listo!",
] as const;

const URL_FIELDS = [
	{ label: "Tu página web", placeholder: "tumarca.com", optional: false },
	{
		label: "Instagram o LinkedIn (opcional)",
		placeholder: "instagram.com/tumarca",
		optional: true,
	},
	{ label: "Otra página (opcional)", placeholder: "linkedin.com/company/tumarca", optional: true },
] as const;

const STEP_INTRO = [
	"Pega la dirección de tu página y conocemos tu marca en segundos.",
	"Corrige lo que haga falta. Revisamos cada pieza con esto en mente.",
	"Así queda tu marca. Puedes cambiarla cuando quieras desde «Mi marca».",
];

/** Brand-tinted buttons only when the brand color stands out on the white canvas (WCAG 3:1). */
function tintFor(color: string) {
	return contrastRatio(color, INK_LIGHT) >= 3 ? brandStyle(color) : undefined;
}

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
			setUrlError("Revisa las direcciones: alguna no parece una página web.");
			return;
		}
		if (links.length === 0) {
			setUrlError("Pega al menos la dirección de tu página web.");
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
		const filled = withDefaults(input);
		if (filled !== input) setInput(filled);
		const next = validateBrandInput(filled);
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
		<div className="mx-auto w-full max-w-3xl p-3 sm:px-6 sm:py-8">
			<div
				className="grid gap-8 rounded-[var(--radius-panel)] bg-surface px-5 py-7 sm:gap-10 sm:p-12"
				style={step > 0 ? tintFor(primaryColor(input)) : undefined}
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="flex items-center gap-3 text-sm font-medium text-ink">
						<ProductMark />
						Gatekeeper Editorial
					</p>
					<StepIndicator steps={STEPS} current={step} />
				</div>

				<header className="grid gap-3">
					<h1
						ref={headingRef}
						tabIndex={-1}
						className="text-balance text-3xl leading-tight font-light tracking-tight text-ink focus:outline-none sm:text-[40px]"
					>
						{STEP_TITLES[step]}
					</h1>
					<p className="max-w-lg text-sm text-ink-muted sm:text-base">{STEP_INTRO[step]}</p>
				</header>

				{step === 0 ? (
					<form
						onSubmit={(event) => void analyze(event)}
						noValidate
						aria-busy={extracting}
						className="grid gap-8"
					>
						<div className="grid gap-6">
							{URL_FIELDS.map((field, index) => (
								<div key={field.label} className="grid gap-1">
									<label
										htmlFor={`brand-url-${index}`}
										className={`text-xs font-medium ${index === 0 ? "text-ink" : "text-ink-muted"}`}
									>
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
										className={`${underlineInput} ${index === 0 ? "min-h-14 text-xl font-light sm:text-2xl" : ""} disabled:opacity-60`}
									/>
								</div>
							))}
						</div>

						<div aria-live="polite" className="grid gap-3 empty:hidden">
							{extracting ? <ExtractingStatus /> : null}
							{urlError ? (
								<p id="brand-url-error" className="text-sm text-danger">
									{urlError}
								</p>
							) : null}
							{extractError ? (
								<div className="rounded-[var(--radius-card)] bg-danger-soft px-5 py-4 text-sm">
									<p className="text-danger">{extractError}</p>
									<p className="mt-1 text-ink">
										Puedes intentarlo de nuevo o completar tu marca a mano.
									</p>
								</div>
							) : null}
						</div>

						<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
							<button
								type="submit"
								disabled={extracting}
								className={`${primaryButtonLarge} max-sm:w-full`}
							>
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
								<button type="submit" className={`${primaryButtonLarge} max-sm:w-full`}>
									Continuar
								</button>
								<button type="button" onClick={() => goTo(0)} className={ghostButton}>
									Atrás
								</button>
							</>
						}
					/>
				) : null}

				{step === 2 ? (
					<div className="grid gap-6">
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
								className={`${primaryButtonLarge} max-sm:w-full`}
							>
								{saving ? "Guardando tu marca…" : "Entrar a mi bandeja"}
							</button>
							<button
								type="button"
								onClick={() => goTo(1)}
								disabled={saving}
								className={ghostButton}
							>
								Editar
							</button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
