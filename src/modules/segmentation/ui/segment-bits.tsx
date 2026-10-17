import type { SegmentResult } from "../application/segment-profile";
import { isKnown, type LeadProfile, PROGRAM_LABEL, topicLabel } from "../domain/profile";
import { ACTION_LABEL, type NextAction } from "../domain/segment-policy";

/** Literal classes so Tailwind sees them; reuses the soft route colors. */
const ACTION_STYLE: Record<NextAction, { dot: string; soft: string; ink: string }> = {
	ADVISOR: { dot: "bg-approve", soft: "bg-approve-soft", ink: "text-approve-ink" },
	PROPOSAL: { dot: "bg-enrich", soft: "bg-enrich-soft", ink: "text-enrich-ink" },
	NURTURE: { dot: "bg-reject", soft: "bg-reject-soft", ink: "text-reject-ink" },
	HUMAN_REVIEW: { dot: "bg-human", soft: "bg-human-soft", ink: "text-human-ink" },
};

/** Next-action pill: colored dot on a soft tint. */
export function ActionPill({ action }: { action: NextAction }) {
	const style = ACTION_STYLE[action];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.soft} ${style.ink}`}
		>
			<span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${style.dot}`} />
			{ACTION_LABEL[action]}
		</span>
	);
}

/** Thin line "people" icon for the nav (stroke 1.5, like shared/ui/icons). */
export function UsersIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<circle cx="9" cy="8.5" r="3.25" />
			<path d="M3.5 19c.6-3 2.8-4.75 5.5-4.75s4.9 1.75 5.5 4.75" />
			<path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8" />
			<path d="M17.25 14.6c1.7.6 2.9 2.1 3.25 4.4" />
		</svg>
	);
}

/** "Fundador, socio o CEO · Colombia". Unknown values are skipped. */
export function whoLine(profile: LeadProfile): string {
	const parts = [profile.rol, profile.pais].filter(isKnown);
	return parts.length > 0 ? parts.join(" · ") : "Sin rol ni país";
}

export function topicsLine(profile: LeadProfile): string {
	return profile.temas.length > 0
		? profile.temas.map(topicLabel).join(", ")
		: "Sin temas de interés";
}

/** Assigned program, segment label, next action and the short "why". */
export function SegmentSummary({ result }: { result: SegmentResult }) {
	const { decision } = result;
	return (
		<div className="grid gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-base font-medium">{PROGRAM_LABEL[decision.program]}</span>
				<ActionPill action={decision.action} />
			</div>
			<p className="text-xs text-ink-muted">
				Segmento: <span className="text-ink">{decision.label}</span>
			</p>
			{decision.reasons.length > 0 ? (
				<ul className="grid gap-0.5 text-xs leading-relaxed text-ink-muted">
					{decision.reasons.map((reason) => (
						<li key={`${reason.check}-${reason.message}`}>· {reason.message}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
