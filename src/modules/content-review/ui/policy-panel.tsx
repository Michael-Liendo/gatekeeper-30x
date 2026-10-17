"use client";

import { SliderField } from "@/shared/ui/slider-field";
import { defaultEditorialPolicy, type EditorialPolicy } from "../domain/editorial-policy";
import { isSamePolicy } from "./apply-policy";
import { formatPercent } from "./format";
import { POLICY_FIELDS } from "./labels";

interface PolicyPanelProps {
	policy: EditorialPolicy;
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

/** The six thresholds as plain-language sliders ("Ajustes avanzados"). */
export function PolicyPanel({ policy, onChange, onReset }: PolicyPanelProps) {
	const isDefault = isSamePolicy(policy, defaultEditorialPolicy);

	return (
		<div className="grid gap-6">
			<div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
				{POLICY_FIELDS.map((field) => (
					<SliderField
						key={field.key}
						label={field.label}
						description={field.description}
						value={policy[field.key]}
						step={0.05}
						defaultValue={defaultEditorialPolicy[field.key]}
						format={(value) => formatPercent(value)}
						onChange={(value) => onChange(withThreshold(policy, field.key, value))}
					/>
				))}
			</div>
			<button
				type="button"
				onClick={onReset}
				disabled={isDefault}
				className="inline-flex min-h-11 items-center justify-self-start rounded-full border border-line-strong px-5 text-sm font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
			>
				Volver a lo recomendado
			</button>
		</div>
	);
}
