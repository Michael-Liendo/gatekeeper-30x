"use client";

import { useId, useState } from "react";
import { ghostButton, primaryButton, softInput } from "@/shared/ui/button-styles";
import { RefreshIcon } from "@/shared/ui/icons";
import type { ResegmentResult } from "../application/segment-profile";
import { type LeadProfile, PROGRAM_LABEL } from "../domain/profile";
import { ACTION_LABEL, type SegmentDecision } from "../domain/segment-policy";
import { CHANGEABLE_FIELDS, type ChangeableField } from "./options";
import { recalculate } from "./segment-api";
import { SegmentSummary } from "./segment-bits";

/** One plain sentence about what moved after the change. */
function changeText(before: SegmentDecision, after: SegmentDecision): string {
	if (before.program !== after.program || before.action !== after.action) {
		return `Pasó de ${PROGRAM_LABEL[before.program]} (${ACTION_LABEL[before.action].toLowerCase()}) a ${PROGRAM_LABEL[after.program]} (${ACTION_LABEL[after.action].toLowerCase()}).`;
	}
	if (before.label !== after.label) {
		return `Su segmento pasó de “${before.label}” a “${after.label}”; el programa y la acción se mantienen.`;
	}
	return "Con este cambio sigue en el mismo segmento, programa y acción.";
}

function optionsFor(field: ChangeableField): readonly string[] {
	return CHANGEABLE_FIELDS.find((entry) => entry.key === field)?.options ?? [];
}

/** "Cambió su situación": edit one field and recalculate the segment. */
export function RecalculatePanel({
	profile,
	onClose,
}: {
	profile: LeadProfile;
	onClose: () => void;
}) {
	const id = useId();
	const [field, setField] = useState<ChangeableField>("rol");
	const current = profile[field];
	const options = optionsFor(field);
	const [value, setValue] = useState<string>(
		() => options.find((option) => option !== current) ?? current,
	);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<ResegmentResult | null>(null);

	function chooseField(next: ChangeableField) {
		setField(next);
		setValue(optionsFor(next).find((option) => option !== profile[next]) ?? profile[next]);
		setOutcome(null);
	}

	async function onRecalculate() {
		setPending(true);
		setError(null);
		try {
			setOutcome(await recalculate(profile, { [field]: value }));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "No pudimos recalcular.");
		} finally {
			setPending(false);
		}
	}

	const before = outcome?.previous.decision;
	const after = outcome?.result.decision;

	return (
		<div className="grid gap-4 rounded-2xl bg-surface-muted p-4">
			<p className="text-sm font-medium">¿Qué cambió en su situación?</p>
			<div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
				<label className="grid gap-1 text-xs text-ink-muted" htmlFor={`${id}-field`}>
					Dato
					<select
						id={`${id}-field`}
						className={softInput}
						value={field}
						onChange={(event) => chooseField(event.target.value as ChangeableField)}
					>
						{CHANGEABLE_FIELDS.map((entry) => (
							<option key={entry.key} value={entry.key}>
								{entry.label}
							</option>
						))}
					</select>
				</label>
				<label className="grid gap-1 text-xs text-ink-muted" htmlFor={`${id}-value`}>
					Nuevo valor (antes: {current})
					<select
						id={`${id}-value`}
						className={softInput}
						value={value}
						onChange={(event) => setValue(event.target.value)}
					>
						{options.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</label>
			</div>
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className={primaryButton}
					onClick={() => void onRecalculate()}
					disabled={pending || value === current}
					aria-busy={pending}
				>
					<RefreshIcon size={18} />
					{pending ? "Recalculando…" : "Recalcular"}
				</button>
				<button type="button" className={ghostButton} onClick={onClose}>
					Cerrar
				</button>
			</div>
			{error ? (
				<p role="alert" className="text-sm text-danger">
					{error}
				</p>
			) : null}
			<div aria-live="polite">
				{outcome && before && after ? (
					<div className="grid gap-3">
						<p className="text-sm">{changeText(before, after)}</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-2 rounded-2xl border border-line bg-surface p-3">
								<p className="text-xs text-ink-muted">Antes</p>
								<SegmentSummary result={outcome.previous} />
							</div>
							<div className="grid gap-2 rounded-2xl border border-line-strong bg-surface p-3">
								<p className="text-xs text-ink-muted">Ahora</p>
								<SegmentSummary result={outcome.result} />
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
