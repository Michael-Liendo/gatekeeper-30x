import type { ReactNode } from "react";

export type HighlightTone = "lilac" | "aqua" | "plain";

/** Literal classes so Tailwind sees them. */
const TONE: Record<HighlightTone, string> = {
	lilac: "bg-linear-to-br from-lilac-from to-lilac-to",
	aqua: "bg-linear-to-br from-aqua-from to-aqua-to",
	plain: "border border-line bg-surface",
};

interface HighlightCardProps {
	label: string;
	value: string;
	/** Small note next to the number, e.g. "+3 hoy". */
	note?: string;
	icon: ReactNode;
	tone: HighlightTone;
}

/** Pastel card: label and line icon on top, one big light number at the bottom. */
export function HighlightCard({ label, value, note, icon, tone }: HighlightCardProps) {
	return (
		<div
			className={`flex min-w-0 flex-col justify-between gap-3 rounded-card p-4 sm:min-h-44 sm:gap-6 sm:p-6 ${TONE[tone]}`}
		>
			<div className="flex items-start justify-between gap-3">
				<dt className="text-sm font-medium leading-snug">{label}</dt>
				<span
					aria-hidden="true"
					className={`grid size-9 shrink-0 place-items-center rounded-full ${
						tone === "plain" ? "bg-surface-muted" : "bg-surface/55"
					}`}
				>
					{icon}
				</span>
			</div>
			<dd className="flex items-baseline gap-2">
				<span className="text-4xl font-light leading-none tabular-nums sm:text-5xl">{value}</span>
				{note ? <span className="text-xs text-ink/60">{note}</span> : null}
			</dd>
		</div>
	);
}

/** Up to three highlight cards in a row (stacked on phones). */
export function HighlightRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<dl aria-label={label} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
			{children}
		</dl>
	);
}
