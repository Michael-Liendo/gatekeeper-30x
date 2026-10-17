"use client";

import { type ReactNode, useRef, useState } from "react";
import type { ReviewResult } from "../domain/review";
import { PieceDetail } from "./piece-detail";
import { PieceList } from "./piece-list";
import { useReview } from "./review-session-provider";

interface PieceWorkspaceProps {
	items: readonly ReviewResult[];
	listLabel: string;
	backLabel: string;
	/** Rendered instead of the list when there are no items. */
	empty: ReactNode;
	/** Inbox mode: after a decision, jump to the next piece in the list. */
	advanceOnResolve?: boolean;
}

/**
 * List on the left, selected piece on the right. On phones the detail replaces the
 * list until the editor goes back.
 */
export function PieceWorkspace({
	items,
	listLabel,
	backLabel,
	empty,
	advanceOnResolve = false,
}: PieceWorkspaceProps) {
	const { editorActions, submittedIds, changedIds } = useReview();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	// Desktop shows the first piece when nothing (or a piece that left the list) is selected.
	const explicit = items.find((r) => r.piece.id === selectedId) ?? null;
	const current = explicit ?? items[0] ?? null;

	function handleResolved(id: string) {
		if (!advanceOnResolve) return;
		const index = items.findIndex((r) => r.piece.id === id);
		const next = items[index + 1] ?? items[index - 1] ?? null;
		setSelectedId(next ? next.piece.id : null);
	}

	if (items.length === 0) return <>{empty}</>;

	return (
		<div
			ref={rootRef}
			className="grid scroll-mt-4 items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-8"
		>
			<div className={explicit ? "hidden lg:block" : "block"}>
				<PieceList
					items={items}
					selectedId={current?.piece.id ?? null}
					editorActions={editorActions}
					submittedIds={submittedIds}
					changedIds={changedIds}
					onSelect={(id) => {
						setSelectedId(id);
						// On phones the detail replaces the list: bring its top into view.
						if (window.matchMedia("(max-width: 1023px)").matches) {
							window.requestAnimationFrame(() =>
								rootRef.current?.scrollIntoView({ block: "start" }),
							);
						}
					}}
					label={listLabel}
					implicitSelection={!explicit}
				/>
			</div>
			<div
				className={`${explicit ? "block" : "hidden lg:block"} lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:rounded-card lg:border lg:border-line lg:p-7`}
			>
				{current ? (
					<PieceDetail
						key={current.piece.id}
						result={current}
						onBack={() => setSelectedId(null)}
						backLabel={backLabel}
						onResolved={handleResolved}
					/>
				) : null}
			</div>
		</div>
	);
}
