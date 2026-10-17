"use client";

import Image from "next/image";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { useToast } from "@/shared/ui/toast";
import type { ReviewResult } from "../domain/review";
import { AnswerList } from "./answer-list";
import { formatDecimal, formatMs, formatPercent, formatUsd } from "./format";
import {
	brandForResult,
	describePiece,
	EDITOR_ACTION_LABEL,
	PROVIDER_LABEL,
	pieceImage,
	ROUTE_LABEL,
} from "./labels";
import { useReview } from "./review-session-provider";
import { RouteBadge } from "./route-badge";
import type { EditorAction } from "./session-storage";
import { SuggestionsCard } from "./suggestions-card";

interface PieceDetailProps {
	result: ReviewResult;
	/** Shown on phones, where the detail replaces the list. */
	onBack?: () => void;
	backLabel?: string;
	/** Called after the editor resolves the piece (e.g. to move to the next one). */
	onResolved?: (id: string) => void;
}

const button =
	"inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:cursor-progress disabled:opacity-70";
const primary = `${button} bg-primary text-primary-ink hover:opacity-90`;
const secondary = `${button} border border-line-strong bg-surface hover:bg-surface-muted`;

const TOAST_TEXT: Record<EditorAction, string> = {
	approved: "Excepción aprobada",
	rejected: "Pieza rechazada",
	adjusted: "Aprobada con los ajustes de IA",
};

/** Everything about one decision plus the editor's actions on it. */
export function PieceDetail({
	result,
	onBack,
	backLabel = "Volver",
	onResolved,
}: PieceDetailProps) {
	const { brand: sessionBrand } = useSession();
	const {
		policy,
		editorActions,
		enrichments,
		submittedIds,
		originalRoutes,
		setEditorAction,
		enrich,
	} = useReview();
	const { notify } = useToast();
	const { piece } = result;
	const id = piece.id;
	const action = editorActions[id];
	const enrichState = enrichments[id];
	const suggestions = enrichState?.status === "done" ? enrichState.suggestions : result.suggestions;
	const canEnrich = !submittedIds.has(id);
	const image = pieceImage(piece);
	const hasAnswers = Object.keys(result.answers ?? {}).length > 0;
	const providerName = result.provider ? PROVIDER_LABEL[result.provider] : null;
	const originalRoute = originalRoutes.get(id);
	const needsEditor = result.route === "HUMAN_REVIEW" || result.route === "ENRICH_WITH_LLM";

	function resolve(next: EditorAction) {
		setEditorAction(id, next);
		notify(`${TOAST_TEXT[next]}: «${piece.title}»`, {
			label: "Deshacer",
			onAction: () => setEditorAction(id, null),
		});
		onResolved?.(id);
	}

	const facts = [
		{ label: "Latencia", value: formatMs(result.latencyMs) },
		{ label: "Costo", value: formatUsd(result.costUsd) },
		{
			label: "Proveedor",
			value: providerName
				? `${providerName}${result.usedFallback ? " (respaldo)" : ""}`
				: "Ninguno",
		},
		{ label: "Modelo", value: result.model ?? "—" },
		{ label: "Puntaje editorial", value: formatDecimal(result.editorialScore) },
		{ label: "Confianza mínima", value: formatPercent(result.minConfidence) },
	];

	return (
		<article
			aria-labelledby="piece-detail-title"
			className="grid gap-5 rounded-card border border-line bg-surface p-5"
		>
			{onBack ? (
				<button
					type="button"
					onClick={onBack}
					className="-mt-2 -ml-2 inline-flex min-h-11 items-center justify-self-start rounded-lg px-2 text-sm font-medium text-ink-muted hover:text-ink lg:hidden"
				>
					<span aria-hidden="true">‹&nbsp;</span>
					{backLabel}
				</button>
			) : null}

			{image ? (
				<Image
					src={image}
					alt={`Captura enviada: ${piece.title}`}
					width={1200}
					height={900}
					unoptimized
					className="max-h-80 w-full rounded-lg border border-line bg-surface-muted object-contain"
				/>
			) : null}

			<header className="grid gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<RouteBadge route={result.route} size="lg" />
					{originalRoute && originalRoute !== result.route ? (
						<span className="text-xs text-ink-muted">
							Antes de tu política: {ROUTE_LABEL[originalRoute]}
						</span>
					) : null}
				</div>
				<h2 id="piece-detail-title" className="text-xl font-semibold leading-snug">
					{piece.title}
				</h2>
				<p className="text-sm text-ink-muted">
					{describePiece(piece)}
					{piece.expectedRoute
						? `. Ruta esperada: ${ROUTE_LABEL[piece.expectedRoute]} ${result.matchesExpected ? "(coincide)" : "(no coincide)"}`
						: ""}
				</p>
			</header>

			{result.error ? (
				<p role="note" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
					{result.error}
				</p>
			) : null}

			{/* Editor actions */}
			{action ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted p-3">
					<p className="text-sm font-semibold">Resuelta: {EDITOR_ACTION_LABEL[action]}.</p>
					<button type="button" onClick={() => setEditorAction(id, null)} className={secondary}>
						Deshacer
					</button>
				</div>
			) : result.route === "HUMAN_REVIEW" ? (
				<div className="grid gap-2">
					<p className="text-sm text-ink-muted">JEV no puede decidir esta pieza sola. Decide tú.</p>
					<div className="flex flex-wrap gap-2">
						<button type="button" onClick={() => resolve("approved")} className={primary}>
							Aprobar excepción
						</button>
						<button type="button" onClick={() => resolve("rejected")} className={secondary}>
							Rechazar
						</button>
					</div>
				</div>
			) : result.route === "ENRICH_WITH_LLM" ? (
				<div className="grid gap-3">
					<p className="text-sm text-ink-muted">
						Casi lista. Pide ajustes a la IA, apruébala tal cual o recházala.
					</p>
					{suggestions ? <SuggestionsCard suggestions={suggestions} /> : null}
					{enrichState?.status === "error" ? (
						<p role="alert" className="text-sm text-danger">
							{enrichState.message}
						</p>
					) : null}
					<div className="flex flex-wrap gap-2">
						{suggestions ? (
							<button type="button" onClick={() => resolve("adjusted")} className={primary}>
								Aprobar con ajustes
							</button>
						) : canEnrich ? (
							<button
								type="button"
								onClick={() => void enrich(id)}
								disabled={enrichState?.status === "loading"}
								aria-busy={enrichState?.status === "loading"}
								className={primary}
							>
								{enrichState?.status === "loading" ? "Pidiendo ajustes…" : "Sugerir ajustes con IA"}
							</button>
						) : null}
						<button type="button" onClick={() => resolve("approved")} className={secondary}>
							Aprobar sin cambios
						</button>
						<button type="button" onClick={() => resolve("rejected")} className={secondary}>
							Rechazar
						</button>
					</div>
				</div>
			) : (
				<p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-muted">
					{result.route === "AUTO_APPROVE"
						? "Aprobada automáticamente. No necesita al editor."
						: "Descartada automáticamente. No necesita al editor."}
				</p>
			)}

			<section
				aria-labelledby="detail-reasons"
				className="grid gap-2 rounded-lg bg-surface-muted p-4"
			>
				<h3 id="detail-reasons" className="text-sm font-semibold">
					Por qué
					{needsEditor ? " necesita al editor" : ` está ${ROUTE_LABEL[result.route].toLowerCase()}`}
				</h3>
				{result.reasons.length === 0 ? (
					<p className="text-sm text-ink-muted">
						Todas las respuestas superan los umbrales. No se activó ninguna regla.
					</p>
				) : (
					<ul className="grid list-disc gap-1 pl-5 text-sm">
						{result.reasons.map((reason) => (
							<li key={`${reason.check}-${reason.message}`}>{reason.message}</li>
						))}
					</ul>
				)}
			</section>

			<section aria-labelledby="detail-answers" className="grid gap-3">
				<h3 id="detail-answers" className="text-sm font-semibold">
					Respuestas de {providerName ?? "JEV"}
				</h3>
				{hasAnswers ? (
					<AnswerList
						answers={result.answers}
						policy={policy}
						brand={brandForResult(result, sessionBrand)}
					/>
				) : (
					<p className="text-sm text-ink-muted">Ningún modelo respondió para esta pieza.</p>
				)}
			</section>

			<dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-3">
				{facts.map((fact) => (
					<div key={fact.label} className="grid min-w-0 gap-0.5">
						<dt className="text-xs text-ink-muted">{fact.label}</dt>
						<dd className="break-words font-mono text-sm tabular-nums">{fact.value}</dd>
					</div>
				))}
			</dl>

			{piece.body ? (
				<details className="rounded-lg border border-line">
					<summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold">
						Texto de la pieza
					</summary>
					<p className="whitespace-pre-line border-t border-line px-4 py-3 text-sm leading-relaxed">
						{piece.body}
					</p>
				</details>
			) : null}
		</article>
	);
}
