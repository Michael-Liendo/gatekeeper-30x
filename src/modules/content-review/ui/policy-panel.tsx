"use client";

import { SliderField } from "@/shared/ui/slider-field";
import { defaultEditorialPolicy, type EditorialPolicy } from "../domain/editorial-policy";
import { isSamePolicy } from "./apply-policy";
import { formatPercent } from "./format";
import { POLICY_FIELDS } from "./labels";

interface PolicyPanelProps {
	policy: EditorialPolicy;
	hasResults: boolean;
	changedCount: number;
	onChange: (policy: EditorialPolicy) => void;
	onReset: () => void;
}

type ThresholdKey = (typeof POLICY_FIELDS)[number]["key"];

/** Keeps the gray zone coherent: its floor can never pass the auto-approve bar. */
function withThreshold(policy: EditorialPolicy, key: ThresholdKey, value: number): EditorialPolicy {
	const next = { ...policy, [key]: value };
	if (key === "grayZoneFloor") next.grayZoneFloor = Math.min(value, policy.autoApproveConfidence);
	if (key === "autoApproveConfidence") next.grayZoneFloor = Math.min(policy.grayZoneFloor, value);
	return next;
}

export function PolicyPanel({
	policy,
	hasResults,
	changedCount,
	onChange,
	onReset,
}: PolicyPanelProps) {
	const isDefault = isSamePolicy(policy, defaultEditorialPolicy);

	return (
		<section
			aria-labelledby="policy-title"
			className="grid gap-5 rounded-card border border-line bg-surface p-5"
		>
			<div className="grid gap-1.5">
				<div className="flex items-center justify-between gap-3">
					<h2 id="policy-title" className="text-lg font-semibold">
						Política editorial
					</h2>
					<button
						type="button"
						onClick={onReset}
						disabled={isDefault}
						className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
					>
						Restablecer
					</button>
				</div>
				<p className="text-sm leading-relaxed text-ink-muted">
					Los umbrales son datos. Al moverlos, las rutas se recalculan con las respuestas que JEV ya
					dio, sin otra llamada al modelo.
				</p>
				{hasResults ? (
					<p aria-live="polite" className="text-sm font-semibold">
						{changedCount === 0
							? "Ninguna pieza cambió de ruta."
							: `${changedCount} ${changedCount === 1 ? "pieza cambió" : "piezas cambiaron"} de ruta.`}
					</p>
				) : null}
			</div>
			<div className="grid gap-5">
				{POLICY_FIELDS.map((field) => (
					<SliderField
						key={field.key}
						label={field.label}
						description={field.description}
						value={policy[field.key]}
						defaultValue={defaultEditorialPolicy[field.key]}
						format={(value) => formatPercent(value)}
						onChange={(value) => onChange(withThreshold(policy, field.key, value))}
					/>
				))}
			</div>
		</section>
	);
}
