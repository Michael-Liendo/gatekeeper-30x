"use client";

import Link from "next/link";
import { type DragEvent, useState } from "react";
import { EmptyState } from "@/modules/content-review/ui/empty-state";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { primaryButton, secondaryButton } from "@/shared/ui/button-styles";
import { PlusIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import type { PieceStatus, WorkspacePiece } from "../domain/workspace";
import { BoardCard, DRAG_TYPE } from "./board-card";
import { LoadExamplesButton } from "./load-examples-button";
import { useAuthorRole } from "./use-author-role";
import { usePieces } from "./use-pieces";
import { messageOf, movePiece } from "./workspace-api";
import { STATUS_LABEL, STATUS_STYLE, STATUSES } from "./workspace-labels";

function BoardSkeleton() {
	return (
		<div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<span className="sr-only">Cargando el tablero…</span>
			{STATUSES.map((status) => (
				<div
					key={status}
					aria-hidden="true"
					className="h-64 rounded-card bg-surface-muted motion-safe:animate-pulse"
				/>
			))}
		</div>
	);
}

interface ColumnProps {
	status: PieceStatus;
	pieces: WorkspacePiece[];
	movingId: string | null;
	onMove: (piece: WorkspacePiece, status: PieceStatus) => void;
	onDropPiece: (id: string, status: PieceStatus) => void;
}

function Column({ status, pieces, movingId, onMove, onDropPiece }: ColumnProps) {
	const roleOf = useAuthorRole();
	const [over, setOver] = useState(false);
	const style = STATUS_STYLE[status];
	const headingId = `board-col-${status}`;

	function accepts(event: DragEvent) {
		return event.dataTransfer.types.includes(DRAG_TYPE);
	}

	return (
		<section
			aria-labelledby={headingId}
			onDragOver={(event) => {
				if (!accepts(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				setOver(true);
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
			}}
			onDrop={(event) => {
				setOver(false);
				const id = event.dataTransfer.getData(DRAG_TYPE);
				if (!id) return;
				event.preventDefault();
				onDropPiece(id, status);
			}}
			className={`grid w-[84%] shrink-0 snap-start content-start gap-3 rounded-card bg-surface-muted p-3 transition-shadow sm:w-[46%] lg:w-auto ${
				over ? "ring-2 ring-ink/20" : ""
			}`}
		>
			<h2 id={headingId} className="flex items-center justify-between gap-2 px-1 pt-1">
				<span
					className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${style.soft} ${style.ink}`}
				>
					<span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
					{STATUS_LABEL[status]}
				</span>
				<span className="text-sm text-ink-muted tabular-nums">
					{pieces.length}
					<span className="sr-only"> piezas</span>
				</span>
			</h2>
			{pieces.length === 0 ? (
				<p className="rounded-[20px] border border-dashed border-line-strong px-4 py-6 text-center text-xs text-ink-muted">
					Nada por aquí
				</p>
			) : (
				<ul className="grid gap-3">
					{pieces.map((piece) => (
						<BoardCard
							key={piece.id}
							piece={piece}
							role={roleOf(piece)}
							moving={movingId === piece.id}
							onMove={onMove}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

/** /tablero: the team's pieces in four columns by status. */
export function BoardView() {
	const { state, retry, replace } = usePieces();
	const { notify } = useToast();
	const [movingId, setMovingId] = useState<string | null>(null);

	async function move(piece: WorkspacePiece, status: PieceStatus) {
		if (piece.status === status) return;
		setMovingId(piece.id);
		replace({ ...piece, status });
		try {
			const saved = await movePiece(piece.id, status);
			replace(saved);
			notify(`«${piece.title}» pasó a ${STATUS_LABEL[status]}`);
		} catch (error) {
			replace(piece);
			notify(messageOf(error));
		} finally {
			setMovingId(null);
		}
	}

	const header = (
		<PageHeader
			title="Tablero del equipo"
			description="Todo lo que subió tu equipo, ordenado por estado. Mueve una pieza con el menú de cada tarjeta o arrastrándola."
			actions={
				<Link href="/nueva" className={primaryButton}>
					<PlusIcon size={18} />
					Subir pieza
				</Link>
			}
		/>
	);

	if (state.status === "loading") {
		return (
			<>
				{header}
				<BoardSkeleton />
			</>
		);
	}

	if (state.status === "error") {
		return (
			<>
				{header}
				<EmptyState
					title="No pudimos cargar el tablero"
					action={
						<button type="button" onClick={retry} className={secondaryButton}>
							Reintentar
						</button>
					}
				>
					{state.message}
				</EmptyState>
			</>
		);
	}

	const { pieces } = state;
	if (pieces.length === 0) {
		return (
			<>
				{header}
				<EmptyState
					title="Tu tablero está vacío"
					action={
						<div className="flex flex-wrap gap-3">
							<Link href="/nueva" className={primaryButton}>
								Sube tu primera pieza
							</Link>
							<LoadExamplesButton onLoaded={retry} />
						</div>
					}
				>
					Cuando subas una pieza, JEV la revisa con tu marca y aparece aquí en la columna que le
					corresponde. ¿Quieres ver cómo se ve? Carga unas piezas de ejemplo.
				</EmptyState>
			</>
		);
	}

	return (
		<>
			{header}
			<div className="-mx-4 flex scroll-px-4 snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
				{STATUSES.map((status) => (
					<Column
						key={status}
						status={status}
						pieces={pieces.filter((piece) => piece.status === status)}
						movingId={movingId}
						onMove={(piece, next) => void move(piece, next)}
						onDropPiece={(id, next) => {
							const piece = pieces.find((p) => p.id === id);
							if (piece) void move(piece, next);
						}}
					/>
				))}
			</div>
		</>
	);
}
