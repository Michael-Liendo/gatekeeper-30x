import type { ReviewResult } from "../domain/review";
import { formatMs } from "./format";
import { describePiece, EDITOR_ACTION_LABEL, pieceImage } from "./labels";
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
}

/** Selectable list of pieces: route, title, where it goes and the main reason. */
export function PieceList({
	items,
	selectedId,
	editorActions,
	submittedIds,
	changedIds,
	onSelect,
	label,
}: PieceListProps) {
	return (
		<ul
			aria-label={label}
			className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface"
		>
			{items.map((result) => {
				const id = result.piece.id;
				const action = editorActions[id];
				const selected = id === selectedId;
				const reason = result.error ?? result.reasons[0]?.message;
				return (
					<li key={id}>
						<button
							type="button"
							aria-current={selected ? "true" : undefined}
							onClick={() => onSelect(id)}
							className="grid min-h-11 w-full gap-1.5 border-l-4 border-transparent px-4 py-3 text-left hover:bg-surface-muted focus-visible:-outline-offset-2 aria-[current=true]:border-primary aria-[current=true]:bg-surface-muted"
						>
							<span className="flex flex-wrap items-center gap-2">
								<RouteBadge route={result.route} />
								{action ? (
									<span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink">
										{EDITOR_ACTION_LABEL[action]}
									</span>
								) : null}
								{submittedIds.has(id) ? (
									<span className="text-xs text-ink-muted">
										{pieceImage(result.piece) ? "Enviada con captura" : "Enviada por ti"}
									</span>
								) : null}
								{changedIds.has(id) ? (
									<span className="text-xs text-ink-muted">Cambió con tu política</span>
								) : null}
								<span className="ml-auto font-mono text-xs text-ink-muted tabular-nums">
									{result.latencyMs > 0 ? formatMs(result.latencyMs) : ""}
								</span>
							</span>
							<span className="font-medium leading-snug">{result.piece.title}</span>
							<span className="line-clamp-2 text-xs text-ink-muted">
								{describePiece(result.piece)}
								{reason ? `. ${reason}` : ""}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
