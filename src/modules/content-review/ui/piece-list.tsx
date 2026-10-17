import type { ReviewResult } from "../domain/review";
import {
	describePiece,
	EDITOR_ACTION_LABEL,
	friendlyReasons,
	ROUTE_LABEL,
	ROUTE_STYLE,
} from "./labels";
import { PieceThumb } from "./piece-thumb";
import { RouteBadge } from "./route-badge";
import type { EditorAction } from "./session-storage";

interface PieceListProps {
	items: readonly ReviewResult[];
	selectedId: string | null;
	editorActions: Readonly<Record<string, EditorAction>>;
	submittedIds: ReadonlySet<string>;
	changedIds: ReadonlySet<string>;
	onSelect: (id: string) => void;
	label: string;
	/** True when the selection is only the desktop default (phones show the plain list). */
	implicitSelection?: boolean;
}

/** One line under the title: what the editor did, or the main reason in plain words. */
function subline(
	result: ReviewResult,
	action: EditorAction | undefined,
	submitted: boolean,
	changed: boolean,
): string {
	if (action) return EDITOR_ACTION_LABEL[action];
	if (changed) return "Cambió con tu política";
	const reason = friendlyReasons(result, 1)[0];
	if (reason) return reason;
	return submitted ? "Enviada por ti" : describePiece(result.piece);
}

/** Selectable rows: thumbnail, title, a friendly note and the route. Selected row is black. */
export function PieceList({
	items,
	selectedId,
	editorActions,
	submittedIds,
	changedIds,
	onSelect,
	label,
	implicitSelection = false,
}: PieceListProps) {
	// Literal classes so Tailwind sees them.
	const row = implicitSelection
		? "lg:bg-primary lg:text-primary-ink hover:bg-surface-muted lg:hover:bg-primary"
		: "bg-primary text-primary-ink";
	const note = implicitSelection ? "text-ink-muted lg:text-primary-ink/70" : "text-primary-ink/70";
	return (
		<ul aria-label={label} className="grid gap-1">
			{items.map((result) => {
				const id = result.piece.id;
				const selected = id === selectedId;
				return (
					<li key={id}>
						<button
							type="button"
							aria-current={selected ? "true" : undefined}
							onClick={() => onSelect(id)}
							className={`flex w-full min-w-0 items-center gap-3 rounded-[20px] p-2.5 pr-3 text-left transition-colors ${
								selected ? row : "hover:bg-surface-muted"
							}`}
						>
							<PieceThumb result={result} />
							<span className="grid min-w-0 flex-1 gap-0.5">
								<span className="line-clamp-2 text-sm font-medium leading-snug">
									{result.piece.title}
								</span>
								<span className={`truncate text-xs ${selected ? note : "text-ink-muted"}`}>
									{subline(result, editorActions[id], submittedIds.has(id), changedIds.has(id))}
								</span>
							</span>
							<span className="hidden shrink-0 min-[420px]:block">
								<RouteBadge route={result.route} inverted={selected && !implicitSelection} />
							</span>
							<span
								className={`size-2.5 shrink-0 rounded-full min-[420px]:hidden ${ROUTE_STYLE[result.route].dot}`}
								title={ROUTE_LABEL[result.route]}
							>
								<span className="sr-only">{ROUTE_LABEL[result.route]}</span>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
