import type { PieceEvent, PieceEventType } from "../domain/workspace";
import { EVENT_LABEL, formatDateTime } from "./workspace-labels";

/** Literal classes so Tailwind sees them. */
const DOT: Record<PieceEventType, string> = {
	submitted: "bg-ink",
	reviewed: "bg-human",
	status_changed: "bg-approve",
	ai_suggested: "bg-enrich",
	version_saved: "bg-enrich",
	note: "bg-line-strong",
};

/** Historial: what happened to the piece, oldest first. */
export function PieceTimeline({ events }: { events: PieceEvent[] }) {
	const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	return (
		<section aria-labelledby="piece-history" className="grid gap-4">
			<h2 id="piece-history" className="text-sm font-medium">
				Historial
			</h2>
			{ordered.length === 0 ? (
				<p className="text-sm text-ink-muted">Todavía no hay movimientos.</p>
			) : (
				<ol className="grid">
					{ordered.map((event, index) => (
						<li
							key={event.id}
							className="relative grid grid-cols-[1.25rem_1fr] gap-3 pb-5 last:pb-0"
						>
							{index < ordered.length - 1 ? (
								<span
									aria-hidden="true"
									className="absolute top-4 bottom-0 left-[0.5625rem] w-px bg-line-strong"
								/>
							) : null}
							<span
								aria-hidden="true"
								className={`relative mt-1.5 size-2.5 justify-self-center rounded-full ring-4 ring-surface ${DOT[event.type]}`}
							/>
							<div className="grid gap-0.5">
								<p className="text-sm leading-snug">{event.summary}</p>
								<p className="text-xs text-ink-muted">
									{EVENT_LABEL[event.type]} · {event.actorName} ·{" "}
									<time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
								</p>
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
