"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/modules/content-review/ui/empty-state";
import {
	describePiece,
	friendlyReasons,
	pieceHighlights,
} from "@/modules/content-review/ui/labels";
import { LoadingBlock } from "@/modules/content-review/ui/loading-block";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { RouteBadge } from "@/modules/content-review/ui/route-badge";
import { primaryButton, primaryButtonLarge, secondaryButton } from "@/shared/ui/button-styles";
import { CopyActions } from "@/shared/ui/copy-actions";
import { ApiError } from "@/shared/ui/fetch-json";
import { CalendarIcon, CheckIcon, CloseIcon, RefreshIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import type { PieceEvent, PieceStatus, WorkspacePiece } from "../domain/workspace";
import { PieceTimeline } from "./piece-timeline";
import { PublishMenu } from "./publish-menu";
import { RegeneratePanel } from "./regenerate-panel";
import { RoleChip } from "./role-chip";
import { useAuthorRole } from "./use-author-role";
import { getPiece, messageOf, movePiece } from "./workspace-api";
import {
	formatScheduled,
	STATUS_HINT,
	STATUS_LABEL,
	STATUS_STYLE,
	timeAgo,
} from "./workspace-labels";

type State =
	| { status: "loading" }
	| { status: "missing" }
	| { status: "error"; message: string }
	| { status: "ready"; piece: WorkspacePiece; events: PieceEvent[] };

const ACTIONS: readonly {
	status: PieceStatus;
	label: string;
	icon?: "check" | "close" | "redo";
}[] = [
	{ status: "approved", label: "Aprobar", icon: "check" },
	{ status: "rejected", label: "Rechazar", icon: "close" },
	{ status: "needs_changes", label: "Mover a Por mejorar", icon: "redo" },
	{ status: "in_review", label: "Volver a Por revisar" },
];

function ActionIcon({ icon }: { icon?: "check" | "close" | "redo" }) {
	if (icon === "check") return <CheckIcon size={18} />;
	if (icon === "close") return <CloseIcon size={18} />;
	if (icon === "redo") return <RefreshIcon size={18} />;
	return null;
}

function reasonsTitle(status: PieceStatus): string {
	if (status === "approved") return "Por qué está aprobada";
	if (status === "rejected") return "Por qué se rechazó";
	if (status === "needs_changes") return "Por qué hay que mejorarla";
	return "Por qué necesita una revisión";
}

/** Detail of a stored piece: decision, reasons, actions, AI regeneration and history. */
export function WorkspacePieceView({ id }: { id: string }) {
	const { notify } = useToast();
	const roleOf = useAuthorRole();
	const [state, setState] = useState<State>({ status: "loading" });
	const [moving, setMoving] = useState<PieceStatus | null>(null);
	const [attempt, setAttempt] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the fetch on retry.
	useEffect(() => {
		const controller = new AbortController();
		getPiece(id, controller.signal)
			.then(({ piece, events }) => setState({ status: "ready", piece, events }))
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				if (error instanceof ApiError && error.status === 404) {
					setState({ status: "missing" });
					return;
				}
				setState({ status: "error", message: messageOf(error) });
			});
		return () => controller.abort();
	}, [id, attempt]);

	/** Refresh piece + events after a change, keeping the page on screen. */
	const reload = useCallback(() => setAttempt((value) => value + 1), []);

	const header = (
		<PageHeader
			title="Tu pieza"
			description="Lo que decidió JEV, qué hacer ahora y todo lo que le pasó."
			actions={
				<>
					<Link href="/tablero" className={secondaryButton}>
						Ver tablero
					</Link>
					<Link href="/nueva" className={primaryButton}>
						Subir otro post
					</Link>
				</>
			}
		/>
	);

	if (state.status === "loading") {
		return (
			<>
				{header}
				<LoadingBlock />
			</>
		);
	}
	if (state.status === "missing") {
		return (
			<EmptyState
				title="No encontramos esta pieza"
				action={
					<Link href="/mis-piezas" className={primaryButton}>
						Ver mis piezas
					</Link>
				}
			>
				Puede que se haya borrado o que sea de otra cuenta.
			</EmptyState>
		);
	}
	if (state.status === "error") {
		return (
			<>
				{header}
				<EmptyState
					title="No pudimos cargar la pieza"
					action={
						<button type="button" onClick={reload} className={secondaryButton}>
							Reintentar
						</button>
					}
				>
					{state.message}
				</EmptyState>
			</>
		);
	}

	const { piece, events } = state;
	const style = STATUS_STYLE[piece.status];
	const reasons = friendlyReasons(piece.review);
	const highlights = pieceHighlights(piece.review.answers ?? {});
	const copyText = piece.body ? `${piece.title}\n\n${piece.body}` : piece.title;
	const fileName = `pieza-v${piece.version}`;

	async function move(status: PieceStatus) {
		setMoving(status);
		try {
			const saved = await movePiece(piece.id, status);
			setState((current) => (current.status === "ready" ? { ...current, piece: saved } : current));
			notify(`Movida a ${STATUS_LABEL[status]}`);
			reload();
		} catch (error) {
			notify(messageOf(error));
		} finally {
			setMoving(null);
		}
	}

	return (
		<>
			{header}
			<div className="mx-auto grid w-full max-w-3xl gap-6">
				<section
					aria-label="Estado"
					className={`flex flex-wrap items-center justify-between gap-4 rounded-card ${style.soft} px-6 py-5`}
				>
					<div className="flex items-center gap-4">
						<span aria-hidden="true" className={`size-3 rounded-full ${style.dot}`} />
						<div className="grid gap-0.5">
							<p className={`text-xl font-medium ${style.ink}`}>{STATUS_LABEL[piece.status]}</p>
							<p className="text-sm text-ink-muted">{STATUS_HINT[piece.status]}</p>
						</div>
					</div>
					<span className="rounded-full bg-surface px-3 py-1 text-xs font-medium">
						Versión {piece.version}
					</span>
				</section>

				<article
					aria-labelledby="workspace-piece-title"
					className="grid gap-6 rounded-card border border-line p-5 sm:p-8"
				>
					<header className="grid gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-ink-muted">JEV dijo:</span>
							<RouteBadge route={piece.review.route} />
						</div>
						<h2
							id="workspace-piece-title"
							className="text-balance text-2xl font-normal leading-tight sm:text-[1.75rem]"
						>
							{piece.title}
						</h2>
						<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
							<span>{describePiece(piece)}</span>
							<span aria-hidden="true">·</span>
							<span className="text-ink">{piece.authorName}</span>
							<RoleChip role={roleOf(piece)} />
							<span aria-hidden="true">·</span>
							<time dateTime={piece.updatedAt}>{timeAgo(piece.updatedAt)}</time>
						</p>
						{piece.scheduledFor || piece.campaign ? (
							<p className="flex flex-wrap items-center gap-2 text-sm">
								{piece.scheduledFor ? (
									<Link
										href="/campana"
										className="inline-flex items-center gap-1.5 rounded-full bg-pill px-3 py-1 text-xs font-medium text-pill-ink hover:opacity-85"
									>
										<CalendarIcon size={14} />
										<span>
											Programada:{" "}
											<time dateTime={piece.scheduledFor}>
												{formatScheduled(piece.scheduledFor)}
											</time>
										</span>
									</Link>
								) : null}
								{piece.campaign ? (
									<span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-ink-muted">
										Campaña: <span className="text-ink">{piece.campaign}</span>
									</span>
								) : null}
							</p>
						) : null}
					</header>

					{piece.imageUrl ? (
						<Image
							src={piece.imageUrl}
							alt={`Captura de la pieza: ${piece.title}`}
							width={1200}
							height={900}
							unoptimized
							className="max-h-96 w-full rounded-[20px] bg-surface-muted object-contain"
						/>
					) : null}

					{piece.body ? (
						<p className="whitespace-pre-line rounded-[20px] bg-surface-muted px-5 py-4 text-sm leading-relaxed">
							{piece.body}
						</p>
					) : null}

					<div className="flex flex-wrap items-start gap-2">
						<PublishMenu
							enabled={piece.status === "approved"}
							text={copyText}
							imageSrc={piece.imageUrl}
							fileName={fileName}
						/>
						<CopyActions text={copyText} imageSrc={piece.imageUrl} fileName={fileName} />
					</div>

					{highlights.reach || highlights.fit ? (
						<dl className="grid grid-cols-2 gap-3">
							{highlights.reach ? (
								<div className="grid gap-1 rounded-2xl bg-linear-to-br from-lilac-from to-lilac-to px-4 py-3">
									<dt className="text-xs text-ink-muted">Potencial de alcance</dt>
									<dd className="text-lg font-medium">{highlights.reach}</dd>
								</div>
							) : null}
							{highlights.fit ? (
								<div className="grid gap-1 rounded-2xl bg-linear-to-br from-aqua-from to-aqua-to px-4 py-3">
									<dt className="text-xs text-ink-muted">Encaja con tu línea editorial</dt>
									<dd className="text-lg font-medium">{highlights.fit}</dd>
								</div>
							) : null}
						</dl>
					) : null}

					<section aria-labelledby="workspace-reasons" className="grid gap-3">
						<h3 id="workspace-reasons" className="text-sm font-medium">
							{reasonsTitle(piece.status)}
						</h3>
						{reasons.length === 0 ? (
							<p className="text-sm text-ink-muted">Cumple todo lo que pide tu política.</p>
						) : (
							<ul className="grid gap-2">
								{reasons.map((reason) => (
									<li
										key={reason}
										className="flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm"
									>
										<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink" />
										{reason}
									</li>
								))}
							</ul>
						)}
					</section>

					<div className="grid gap-2">
						<h3 className="text-sm font-medium">Decide qué pasa con ella</h3>
						<div className="flex flex-wrap gap-2">
							{ACTIONS.filter((action) => action.status !== piece.status).map((action) => (
								<button
									key={action.status}
									type="button"
									onClick={() => void move(action.status)}
									disabled={moving !== null}
									aria-busy={moving === action.status}
									className={action.status === "approved" ? primaryButton : secondaryButton}
								>
									<ActionIcon icon={action.icon} />
									{moving === action.status ? "Guardando…" : action.label}
								</button>
							))}
						</div>
					</div>
				</article>

				{piece.status !== "approved" ? (
					<RegeneratePanel
						key={`${piece.id}-v${piece.version}`}
						piece={piece}
						onSaved={(saved) => {
							setState((current) =>
								current.status === "ready" ? { ...current, piece: saved } : current,
							);
							reload();
						}}
					/>
				) : null}

				<div className="rounded-card border border-line p-5 sm:p-8">
					<PieceTimeline events={events} />
				</div>

				<Link href="/nueva" className={`${primaryButtonLarge} justify-self-center`}>
					Subir otro post
				</Link>
			</div>
		</>
	);
}
