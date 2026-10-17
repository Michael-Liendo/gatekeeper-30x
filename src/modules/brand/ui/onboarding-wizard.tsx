"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
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
	"¡Todo listo para publicar!",
] as const;

const STEP_INTRO = [
	"Pega la dirección de tu página y aprendemos el perfil editorial de tu marca en segundos.",
	"Corrige lo que haga falta. Revisaremos cada publicación tomando estas reglas como estándar.",
	"Así queda tu marca configurada. Puedes actualizarla cuando quieras desde «Mi marca».",
];

const ONBOARDING_STEPS = [
	{
		title: "Página web y redes",
		subtitle: "Pega tus enlaces para extraer tu perfil automáticamente.",
	},
	{
		title: "Reglas editoriales",
		subtitle: "Revisa tono, audiencia y temas vetados o permitidos.",
	},
	{
		title: "Guardián listo",
		subtitle: "Tu marca queda lista para filtrar y evaluar publicaciones.",
	},
] as const;

const URL_FIELDS = [
	{
		label: "Tu página web",
		placeholder: "tumarca.com",
		optional: false,
		icon: "globe",
	},
	{
		label: "Instagram o LinkedIn (opcional)",
		placeholder: "instagram.com/tumarca",
		optional: true,
		icon: "social",
	},
	{
		label: "Otra página o enlace (opcional)",
		placeholder: "linkedin.com/company/tumarca",
		optional: true,
		icon: "link",
	},
] as const;

/** Brand-tinted buttons only when the brand color stands out on the white canvas (WCAG 3:1). */
function tintFor(color: string) {
	return contrastRatio(color, INK_LIGHT) >= 3 ? brandStyle(color) : undefined;
}

const inputClass =
	"min-h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3.5 text-base sm:text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-focus focus:ring-2 focus:ring-focus/20 focus:outline-none";

const primaryGradientButton =
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:shadow active:scale-[0.99] disabled:cursor-progress disabled:opacity-75 max-sm:w-full";

const secondaryOutlineButton =
	"inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-50 max-sm:w-full";

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
		<div className="mx-auto w-full max-w-5xl">
			{/* Main Split Card matching Landing Page style */}
			<section
				className="relative grid overflow-hidden rounded-3xl border border-line bg-surface lg:grid-cols-12 min-h-[620px]"
				style={step > 0 ? tintFor(primaryColor(input)) : undefined}
			>
				{/* LEFT COLUMN: Clean Focused Roadmap Hero */}
				<div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#402da8] via-[#5c2bb6] to-[#8c249a] p-8 text-white sm:p-10 lg:col-span-5 lg:p-12">
					{/* Glowing and angled decorative pill elements */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-96 rotate-[-35deg] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-80 blur-xs"
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -bottom-8 left-36 h-48 w-80 rotate-[-35deg] rounded-full bg-gradient-to-r from-orange-400/90 via-pink-500/80 to-purple-600/50 opacity-75 blur-xs"
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute bottom-12 -left-8 h-20 w-60 rotate-[-35deg] rounded-full bg-white/20 backdrop-blur-md"
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute top-12 -right-16 h-72 w-72 rounded-full bg-purple-400/20 blur-2xl"
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute bottom-4 right-10 h-36 w-6 rotate-[-35deg] rounded-full bg-amber-300/60"
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute bottom-24 right-20 h-44 w-4 rotate-[-35deg] rounded-full bg-amber-400/50"
					/>

					{/* Left Column Content */}
					<div className="relative z-10 grid gap-8">
						<header className="grid gap-3">
							<div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md">
								<span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
								<span>Gatekeeper Editorial</span>
							</div>

							<h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
								Configura tu marca
							</h2>

							<p className="text-sm leading-relaxed text-white/80">
								En 3 sencillos pasos, calibramos el filtro con las directrices y el tono único de tu
								empresa.
							</p>
						</header>

						{/* Clean Vertical Roadmap with centered line */}
						<div className="grid">
							{ONBOARDING_STEPS.map((s, idx) => {
								const isDone = idx < step;
								const isCurrent = idx === step;
								const isLast = idx === ONBOARDING_STEPS.length - 1;
								return (
									<div key={s.title} className="flex items-start gap-3.5">
										{/* Step marker column: perfectly centered circle + connecting vertical line */}
										<div className="flex flex-col items-center self-stretch">
											<span
												aria-hidden="true"
												className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
													isDone
														? "bg-emerald-400 text-ink shadow-[0_0_8px_rgba(52,211,153,0.6)]"
														: isCurrent
															? "bg-amber-400 text-ink shadow-[0_0_8px_rgba(251,191,36,0.8)]"
															: "border border-white/30 bg-white/10 text-white/60"
												}`}
											>
												{isDone ? "✓" : idx + 1}
											</span>
											{!isLast ? (
												<div
													aria-hidden="true"
													className={`w-px flex-1 min-h-6 my-1.5 transition-colors ${
														isDone ? "bg-emerald-400/40" : "bg-white/20"
													}`}
												/>
											) : null}
										</div>

										{/* Content column */}
										<div className={`grid gap-0.5 pt-0.5 ${!isLast ? "pb-6" : ""}`}>
											<p
												className={`text-sm font-semibold transition-colors ${
													isCurrent ? "text-white" : isDone ? "text-white/90" : "text-white/50"
												}`}
											>
												{s.title}
											</p>
											<p
												className={`text-xs leading-relaxed transition-colors ${
													isCurrent ? "text-white/80" : "text-white/50"
												}`}
											>
												{s.subtitle}
											</p>
										</div>
									</div>
								);
							})}
						</div>

						{/* Brand preview pill if name is set */}
						{input.name ? (
							<div className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/90 backdrop-blur-md">
								<span
									className="size-3 rounded-full border border-white/30 shadow-xs"
									style={{ backgroundColor: primaryColor(input) }}
								/>
								<span className="font-medium truncate max-w-[200px]">Marca: {input.name}</span>
							</div>
						) : null}
					</div>

					{/* Footer Tip */}
					<footer className="relative z-10 pt-4 text-xs text-white/70">
						<p>💡 Podrás modificar estos ajustes en cualquier momento desde «Mi marca».</p>
					</footer>
				</div>

				{/* RIGHT COLUMN: Clean Step Form */}
				<div className="flex flex-col justify-between bg-surface p-8 sm:p-10 lg:col-span-7 lg:p-12">
					<div className="grid gap-6">
						{/* Progress Bar & Step Badge */}
						<div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
							<span className="inline-flex w-fit items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted">
								Paso {step + 1} de {STEPS.length}
							</span>
							<StepIndicator steps={STEPS} current={step} />
						</div>

						{/* Header */}
						<header className="grid gap-2 text-left">
							<h1
								ref={headingRef}
								tabIndex={-1}
								className="text-2xl font-bold tracking-tight text-ink sm:text-3xl focus:outline-none"
							>
								{STEP_TITLES[step]}
							</h1>
							<p className="text-sm text-ink-muted leading-relaxed">{STEP_INTRO[step]}</p>
						</header>

						{/* STEP 0: URLs form */}
						{step === 0 ? (
							<form
								onSubmit={(event) => void analyze(event)}
								noValidate
								aria-busy={extracting}
								className="grid gap-6"
							>
								<div className="grid gap-4">
									{URL_FIELDS.map((field, index) => (
										<div key={field.label} className="grid gap-1.5">
											<label
												htmlFor={`brand-url-${index}`}
												className="text-xs font-semibold tracking-wide uppercase text-ink-muted"
											>
												{field.label}
											</label>
											<div className="relative">
												<span
													aria-hidden="true"
													className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted/80"
												>
													{field.icon === "globe" ? (
														<svg
															aria-hidden="true"
															className="size-4"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth="2"
															stroke="currentColor"
														>
															<title>Icono de web</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
															/>
														</svg>
													) : field.icon === "social" ? (
														<svg
															aria-hidden="true"
															className="size-4"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth="2"
															stroke="currentColor"
														>
															<title>Icono de red social</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
															/>
														</svg>
													) : (
														<svg
															aria-hidden="true"
															className="size-4"
															fill="none"
															viewBox="0 0 24 24"
															strokeWidth="2"
															stroke="currentColor"
														>
															<title>Icono de enlace</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
															/>
														</svg>
													)}
												</span>
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
													className={`${inputClass} disabled:opacity-60`}
												/>
											</div>
										</div>
									))}
								</div>

								<div aria-live="polite" className="grid gap-3 empty:hidden">
									{extracting ? <ExtractingStatus /> : null}
									{urlError ? (
										<p
											id="brand-url-error"
											className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
										>
											{urlError}
										</p>
									) : null}
									{extractError ? (
										<div className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-xs">
											<p className="font-semibold text-danger">{extractError}</p>
											<p className="mt-1 text-ink">
												Puedes intentarlo de nuevo o completar tu marca a mano.
											</p>
										</div>
									) : null}
								</div>

								<div className="flex flex-wrap items-center gap-3 pt-2">
									<button type="submit" disabled={extracting} className={primaryGradientButton}>
										<span>{extracting ? "Analizando tu marca…" : "Analizar mi marca"}</span>
										{!extracting ? (
											<svg
												aria-hidden="true"
												className="size-4"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth="2.5"
												stroke="currentColor"
											>
												<title>Flecha hacia adelante</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
												/>
											</svg>
										) : null}
									</button>
									<button
										type="button"
										onClick={fillManually}
										disabled={extracting}
										className={secondaryOutlineButton}
									>
										Prefiero llenarlo a mano
									</button>
								</div>
							</form>
						) : null}

						{/* STEP 1: Brand Form */}
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
									<div className="flex flex-wrap items-center gap-3 pt-4">
										<button type="submit" className={primaryGradientButton}>
											<span>Continuar</span>
											<svg
												aria-hidden="true"
												className="size-4"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth="2.5"
												stroke="currentColor"
											>
												<title>Flecha hacia adelante</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
												/>
											</svg>
										</button>
										<button
											type="button"
											onClick={() => goTo(0)}
											className={secondaryOutlineButton}
										>
											Atrás
										</button>
									</div>
								}
							/>
						) : null}

						{/* STEP 2: Brand Summary */}
						{step === 2 ? (
							<div className="grid gap-6">
								<BrandSummary brand={input} />
								<div aria-live="polite" className="empty:hidden">
									{saveError ? (
										<p className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
											{saveError}
										</p>
									) : null}
								</div>
								<div className="flex flex-wrap items-center gap-3 pt-2">
									<button
										type="button"
										onClick={() => void finish()}
										disabled={saving}
										aria-busy={saving}
										className={primaryGradientButton}
									>
										<span>{saving ? "Guardando tu marca…" : "Entrar a mi bandeja"}</span>
										{!saving ? (
											<svg
												aria-hidden="true"
												className="size-4"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth="2.5"
												stroke="currentColor"
											>
												<title>Flecha hacia adelante</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
												/>
											</svg>
										) : null}
									</button>
									<button
										type="button"
										onClick={() => goTo(1)}
										disabled={saving}
										className={secondaryOutlineButton}
									>
										Editar
									</button>
								</div>
							</div>
						) : null}
					</div>

					<footer className="pt-6 text-center text-xs text-ink-muted">
						Demo para el <span className="font-semibold text-ink">Hackathon 30X</span> · Tu marca y
						reglas se guardan de forma aislada.
					</footer>
				</div>
			</section>
		</div>
	);
}
