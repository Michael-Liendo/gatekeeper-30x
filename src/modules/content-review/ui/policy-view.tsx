"use client";

import { ChevronDownIcon } from "@/shared/ui/icons";
import type { EditorialPolicy } from "../domain/editorial-policy";
import type { ReviewResult } from "../domain/review";
import { applyPolicy } from "./apply-policy";
import { PageHeader } from "./page-header";
import { PolicyPanel } from "./policy-panel";
import { matchingPreset, POLICY_PRESETS, type PresetId } from "./policy-presets";
import { useReview } from "./review-session-provider";
import { RouteBadge } from "./route-badge";

/** Literal classes so Tailwind sees them: one soft surface per preset. */
const PRESET_SURFACE: Record<PresetId, string> = {
	strict: "border border-line bg-surface",
	balanced: "bg-linear-to-br from-lilac-from to-lilac-to",
	flexible: "bg-linear-to-br from-aqua-from to-aqua-to",
};

/** "~4 de cada 10 piezas se aprueban solas", from the answers already on hand. */
function expectedEffect(results: readonly ReviewResult[], policy: EditorialPolicy): string {
	if (results.length === 0) return "";
	const routed = results.map((r) => applyPolicy(r, policy).route);
	const share = (count: number) => Math.round((count / routed.length) * 10);
	const approved = share(routed.filter((route) => route === "AUTO_APPROVE").length);
	const toYou = share(
		routed.filter((route) => route === "HUMAN_REVIEW" || route === "ENRICH_WITH_LLM").length,
	);
	return `~${approved} de cada 10 piezas se aprueban solas y ~${toYou} te llegan a ti.`;
}

/** Choose how strict the gatekeeper is; raw thresholds stay under "Ajustes avanzados". */
export function PolicyView() {
	const { policy, setPolicy, resetPolicy, results, originalRoutes, changedIds, hydrated } =
		useReview();
	const current = matchingPreset(policy);
	const hasResults = hydrated && results.length > 0;
	const changed = results.filter((r) => changedIds.has(r.piece.id));

	return (
		<>
			<PageHeader
				title="Decide qué tan exigente es tu filtro"
				description="Elige un estilo. Los cambios se aplican al momento sobre el contenido que ya revisaste."
			/>

			<fieldset className="grid gap-4">
				<legend className="sr-only">Estilo de revisión</legend>
				<div className="grid gap-3 md:grid-cols-3 md:gap-4">
					{POLICY_PRESETS.map((preset) => {
						const selected = current?.id === preset.id;
						const effect = hasResults ? expectedEffect(results, preset.policy) : "";
						return (
							<label
								key={preset.id}
								className={`relative flex min-h-44 cursor-pointer flex-col justify-between gap-6 rounded-card p-6 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${PRESET_SURFACE[preset.id]} ${
									selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
								}`}
							>
								<input
									type="radio"
									name="policy-preset"
									value={preset.id}
									checked={selected}
									onChange={() => setPolicy(preset.policy)}
									className="sr-only"
								/>
								<span className="grid gap-2">
									<span className="flex items-center justify-between gap-3">
										<span className="text-2xl font-normal">{preset.name}</span>
										<span
											aria-hidden="true"
											className={`grid size-6 place-items-center rounded-full border ${
												selected ? "border-ink bg-ink" : "border-ink/30 bg-surface/50"
											}`}
										>
											{selected ? <span className="size-2 rounded-full bg-surface" /> : null}
										</span>
									</span>
									<span className="text-sm leading-relaxed text-ink/75">{preset.summary}</span>
								</span>
								{effect ? <span className="text-sm font-medium">{effect}</span> : null}
							</label>
						);
					})}
				</div>
				<p aria-live="polite" className="text-sm text-ink-muted">
					{current
						? hasResults
							? changed.length === 0
								? "Ninguna pieza cambió de destino."
								: `${changed.length} ${changed.length === 1 ? "pieza cambió" : "piezas cambiaron"} de destino con este estilo.`
							: "Revisa contenido para ver cuántas piezas se aprueban solas con cada estilo."
						: "Usas ajustes personalizados. Elige un estilo para volver a uno predefinido."}
				</p>
			</fieldset>

			{changed.length > 0 ? (
				<section aria-labelledby="changed-title" className="mt-10 grid gap-4">
					<h2 id="changed-title" className="text-lg font-normal">
						Qué cambió
					</h2>
					<ul className="grid gap-2">
						{changed.map((result) => {
							const original = originalRoutes.get(result.piece.id);
							return (
								<li
									key={result.piece.id}
									className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[20px] bg-surface-muted px-4 py-3"
								>
									<span className="min-w-0 text-sm">{result.piece.title}</span>
									<span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
										{original ? <RouteBadge route={original} /> : null}
										<span aria-hidden="true">→</span>
										<span className="sr-only">ahora</span>
										<RouteBadge route={result.route} />
									</span>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			<details className="group mt-10 rounded-card border border-line">
				<summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 text-sm font-medium [&::-webkit-details-marker]:hidden">
					Ajustes avanzados
					<ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
				</summary>
				<div className="border-t border-line px-6 py-6">
					<PolicyPanel policy={policy} onChange={setPolicy} onReset={resetPolicy} />
				</div>
			</details>
		</>
	);
}
