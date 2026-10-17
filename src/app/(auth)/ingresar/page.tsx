import type { Metadata } from "next";
import { SignInForm } from "@/modules/accounts/ui/sign-in-form";

export const metadata: Metadata = {
	title: "Ingresar · Gatekeeper Editorial",
	description:
		"Filtro editorial inteligente que aprueba, enriquece con IA y escala casos críticos en milisegundos.",
};

export default function SignInPage() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			{/* Main Split Card inspired by modern hero/auth landing */}
			<section className="relative grid overflow-hidden rounded-3xl border border-line bg-surface lg:grid-cols-12">
				{/* LEFT COLUMN: Rich informative showcase & workflow */}
				<div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#402da8] via-[#5c2bb6] to-[#8c249a] p-8 text-white sm:p-10 lg:col-span-7 lg:p-12">
					{/* Glowing and angled decorative pill elements matching inspiration image */}
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
						{/* Brand Pill & Title */}
						<header className="grid gap-3">
							<div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md">
								<span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
								<span>Gatekeeper Editorial · 30X</span>
							</div>

							<h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
								El filtro inteligente para publicaciones masivas
							</h1>

							<p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
								Publica con velocidad y protege la reputación de tu marca. Evaluamos posts, guiones,
								hilos y newsletters en milisegundos con reglas editoriales precisas.
							</p>
						</header>

						{/* "¿Cómo funciona?" Step Flow */}
						<div className="grid gap-3">
							<h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
								¿Cómo funciona el flujo?
							</h2>

							<div className="grid gap-2.5">
								{/* Step 1 */}
								<div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/15">
									<div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xs font-bold text-ink shadow-sm">
										1
									</div>
									<div className="grid gap-0.5">
										<p className="text-sm font-semibold text-white">Triage JEV en &lt; 200ms</p>
										<p className="text-xs text-white/80 leading-relaxed">
											Analiza relevancia, ofertas no autorizadas, tono y riesgos de marca sin sesgo.
										</p>
									</div>
								</div>

								{/* Step 2 */}
								<div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/15">
									<div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-indigo-300 text-xs font-bold text-ink shadow-sm">
										2
									</div>
									<div className="grid gap-0.5">
										<p className="text-sm font-semibold text-white">Ajuste puntual con IA</p>
										<p className="text-xs text-white/80 leading-relaxed">
											Si la pieza es dudosa o muy promocional, un LLM sugiere la corrección exacta.
										</p>
									</div>
								</div>

								{/* Step 3 */}
								<div className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md transition-all hover:bg-white/15">
									<div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-xs font-bold text-ink shadow-sm">
										3
									</div>
									<div className="grid gap-0.5">
										<p className="text-sm font-semibold text-white">Decisión y control humano</p>
										<p className="text-xs text-white/80 leading-relaxed">
											Lo óptimo se aprueba solo; los casos de alto riesgo van al panel del editor.
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Status Pills */}
						<div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
							<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 font-medium text-emerald-200 backdrop-blur-xs">
								Aprobado automático
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 font-medium text-blue-200 backdrop-blur-xs">
								Enriquecido IA
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 font-medium text-amber-200 backdrop-blur-xs">
								Revisión editorial
							</span>
						</div>
					</div>

					{/* Quote / Footer note */}
					<footer className="relative z-10 pt-6">
						<blockquote className="border-l border-white/30 pl-3 text-xs italic text-white/80">
							«JEV decide, el LLM corrige y el equipo solo revisa lo que de verdad importa.»
						</blockquote>
					</footer>
				</div>

				{/* RIGHT COLUMN: Clean Login & Access */}
				<div className="flex flex-col justify-between bg-surface p-8 sm:p-10 lg:col-span-5 lg:p-12">
					<div className="grid gap-6">
						<header className="grid gap-2 text-left">
							<span className="inline-flex w-fit items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted">
								Acceso al panel
							</span>
							<h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
								Iniciar sesión
							</h2>
							<p className="text-sm text-ink-muted leading-relaxed">
								Ingresa tu correo para calibrar tu marca y gestionar la cola de revisión.
							</p>
						</header>

						{/* Interactive Form */}
						<SignInForm />

						{/* Highlights / Trust Points */}
						<div className="grid gap-3 rounded-2xl border border-line bg-surface-muted/50 p-4 text-xs text-ink-muted">
							<div className="flex items-center gap-2">
								<span className="text-base">⚡</span>
								<span>
									<strong className="font-semibold text-ink">Sin contraseñas:</strong> solo tu
									correo para activar o restaurar tu marca.
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-base">🛡️</span>
								<span>
									<strong className="font-semibold text-ink">Reglas configurables:</strong> define
									tono, temas vetados y umbrales.
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-base">🚀</span>
								<span>
									<strong className="font-semibold text-ink">Decisiones en milisegundos:</strong>{" "}
									escala sin fricción editorial.
								</span>
							</div>
						</div>
					</div>

					<footer className="pt-6 text-center text-xs text-ink-muted">
						Demo para el <span className="font-semibold text-ink">Hackathon 30X</span> · Privacidad
						y datos de prueba protegidos.
					</footer>
				</div>
			</section>
		</div>
	);
}
