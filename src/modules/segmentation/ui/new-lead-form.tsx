"use client";

import { type FormEvent, useId, useState } from "react";
import { ghostButton, primaryButton, softInput } from "@/shared/ui/button-styles";
import {
	COUNTRY_OPTIONS,
	EMPTY_LEAD,
	GOAL_OPTIONS,
	type LeadForm,
	PAIN_OPTIONS,
	RELATION_OPTIONS,
	ROLE_OPTIONS,
	TOPIC_OPTIONS,
} from "./options";
import { RecalculatePanel } from "./recalculate-panel";
import { type SingleSegmentResponse, segmentLead } from "./segment-api";
import { SegmentSummary } from "./segment-bits";

function Select({
	id,
	label,
	value,
	options,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	options: readonly (string | { value: string; label: string })[];
	onChange: (value: string) => void;
}) {
	return (
		<label htmlFor={id} className="grid gap-1 text-xs text-ink-muted">
			{label}
			<select
				id={id}
				className={softInput}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{options.map((option) => {
					const entry = typeof option === "string" ? { value: option, label: option } : option;
					return (
						<option key={entry.value} value={entry.value}>
							{entry.label}
						</option>
					);
				})}
			</select>
		</label>
	);
}

/** "Nuevo inscrito": fill what a Luma sign-up would give and segment it live. */
export function NewLeadForm() {
	const id = useId();
	const [lead, setLead] = useState<LeadForm>(EMPTY_LEAD);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<SingleSegmentResponse | null>(null);
	const [changing, setChanging] = useState(false);

	const set = <K extends keyof LeadForm>(key: K, value: LeadForm[K]) =>
		setLead((current) => ({ ...current, [key]: value }));

	function toggleTopic(tag: string) {
		set(
			"temas",
			lead.temas.includes(tag) ? lead.temas.filter((t) => t !== tag) : [...lead.temas, tag],
		);
	}

	async function onSubmit(event: FormEvent) {
		event.preventDefault();
		setPending(true);
		setError(null);
		setChanging(false);
		try {
			setOutcome(await segmentLead(lead));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "No pudimos ubicar a esta persona.");
		} finally {
			setPending(false);
		}
	}

	return (
		<section
			aria-labelledby={`${id}-title`}
			className="grid gap-5 rounded-card border border-line p-5 sm:p-6"
		>
			<div className="grid gap-1">
				<h2 id={`${id}-title`} className="text-xl font-normal">
					Nuevo inscrito
				</h2>
				<p className="text-sm text-ink-muted">
					Llena lo que alguien deja al inscribirse y mira en qué segmento queda.
				</p>
			</div>
			<form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-2">
					<Select
						id={`${id}-rol`}
						label="Rol"
						value={lead.rol}
						options={ROLE_OPTIONS}
						onChange={(value) => set("rol", value)}
					/>
					<Select
						id={`${id}-pais`}
						label="País"
						value={lead.pais}
						options={COUNTRY_OPTIONS}
						onChange={(value) => set("pais", value)}
					/>
					<Select
						id={`${id}-dolor`}
						label="Dolor principal"
						value={lead.dolor}
						options={PAIN_OPTIONS}
						onChange={(value) => set("dolor", value)}
					/>
					<Select
						id={`${id}-objetivo`}
						label="Objetivo principal"
						value={lead.objetivo}
						options={GOAL_OPTIONS}
						onChange={(value) => set("objetivo", value)}
					/>
					<div className="sm:col-span-2">
						<Select
							id={`${id}-relacion`}
							label="Relación con 30X"
							value={lead.relacion}
							options={RELATION_OPTIONS}
							onChange={(value) => set("relacion", value)}
						/>
					</div>
				</div>
				<fieldset className="grid gap-2">
					<legend className="mb-1 text-xs text-ink-muted">Temas de interés</legend>
					<div className="flex flex-wrap gap-2">
						{TOPIC_OPTIONS.map((topic) => {
							const checked = lead.temas.includes(topic.value);
							return (
								<label
									key={topic.value}
									className={`inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
										checked
											? "border-transparent bg-pill text-pill-ink"
											: "border-line-strong text-ink-muted hover:text-ink"
									}`}
								>
									<input
										type="checkbox"
										className="sr-only"
										checked={checked}
										onChange={() => toggleTopic(topic.value)}
									/>
									{topic.label}
								</label>
							);
						})}
					</div>
				</fieldset>
				<div>
					<button type="submit" className={primaryButton} disabled={pending} aria-busy={pending}>
						{pending ? "Ubicando…" : "Ubicar en un segmento"}
					</button>
				</div>
			</form>
			{error ? (
				<p role="alert" className="text-sm text-danger">
					{error}
				</p>
			) : null}
			<div aria-live="polite">
				{outcome ? (
					<div className="grid gap-4 rounded-2xl bg-surface-muted p-4">
						<SegmentSummary result={outcome.result} />
						{changing ? (
							<RecalculatePanel profile={outcome.profile} onClose={() => setChanging(false)} />
						) : (
							<div>
								<button type="button" className={ghostButton} onClick={() => setChanging(true)}>
									Cambió su situación
								</button>
							</div>
						)}
					</div>
				) : null}
			</div>
		</section>
	);
}
