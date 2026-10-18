"use client";

import Image from "next/image";
import { useSession } from "@/modules/accounts/ui/session-provider";
import {
	ArrowLeftIcon,
	CheckIcon,
	ChevronDownIcon,
	CloseIcon,
	SparkleIcon,
} from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import type { ReviewResult } from "../domain/review";
import { AnswerList } from "./answer-list";
import { formatDecimal, formatMs, formatPercent } from "./format";
import {
	brandForResult,
	decisionCertainty,
	describePiece,
	EDITOR_ACTION_LABEL,
	friendlyReasons,
	PROVIDER_LABEL,
	pieceHighlights,
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

const action =
	"inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors disabled:cursor-progress disabled:opacity-70";
const primary = `${action} bg-primary text-primary-ink hover:opacity-90`;
const secondary = `${action} border border-line-strong bg-surface text-ink hover:bg-surface-muted`;
const ai = `${action} bg-linear-to-br from-lilac-from to-lilac-to text-ink hover:opacity-90`;

const TOAST_TEXT: Record<EditorAction, string> = {
	approved: "Aprobada",
	rejected: "Rechazada",
	adjusted: "Aprobada con las mejoras de la IA",
};

/** One piece: what was decided, why in plain words, and the editor's actions. */
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
	const decided = editorActions[id];
	const enrichState = enrichments[id];
	const suggestions = enrichState?.status === "done" ? enrichState.suggestions : result.suggestions;
	const canEnrich = !submittedIds.has(id);
	const enriching = enrichState?.status === "loading";
	const image = pieceImage(piece);
	const hasAnswers = Object.keys(result.answers ?? {}).length > 0;
	const providerName = result.provider ? PROVIDER_LABEL[result.provider] : null;
	const originalRoute = originalRoutes.get(id);
	const needsEditor = result.route === "HUMAN_REVIEW" || result.route === "ENRICH_WITH_LLM";
	const reasons = friendlyReasons(result);
	const certainty = hasAnswers ? decisionCertainty(result.minConfidence, policy) : null;
	const highlights = pieceHighlights(result.answers);

	function resolve(next: EditorAction) {
		setEditorAction(id, next);
		notify(`${TOAST_TEXT[next]}: «${piece.title}»`, {
			label: "Deshacer",
			onAction: () => setEditorAction(id, null),
		});
		onResolved?.(id);
	}

	const facts = [
		{ label: "Tiempo de respuesta", value: formatMs(result.latencyMs) },
		{
			label: "Proveedor",
			value: providerName
				? `${providerName}${result.usedFallback ? " (respaldo)" : ""}`
				: "Ninguno",
		},
		{ label: "Modelo", value: result.model ?? "—" },
		{ label: "Puntaje editorial", value: formatDecimal(result.editorialScore) },
		{ label: "Confianza mínima", value: formatPercent(result.minConfidence) },
		{ label: "Tokens de entrada", value: result.inputTokens?.toString() ?? "—" },
		{
			label: "Ruta esperada",
			value: piece.expectedRoute
				? `${ROUTE_LABEL[piece.expectedRoute]} ${result.matchesExpected ? "(coincide)" : "(no coincide)"}`
				: "—",
		},
	];

	return (
		<article aria-labelledby="piece-detail-title" className="grid gap-6">
			{onBack ? (
				<button
					type="button"
					onClick={onBack}
					className="-ml-2 inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full px-2 text-sm text-ink-muted hover:text-ink lg:hidden"
				>
					<ArrowLeftIcon size={18} />
					{backLabel}
				</button>
			) : null}

			<header className="grid gap-3">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					<RouteBadge route={result.route} size="lg" />
					{certainty ? (
						<span className="text-xs text-ink-muted">Seguridad de la decisión: {certainty}</span>
					) : null}
				</div>
				<h2
					id="piece-detail-title"
					className="text-balance text-2xl font-normal leading-tight sm:text-[1.75rem]"
				>
					{piece.title}
				</h2>
				<p className="text-sm text-ink-muted">
					{describePiece(piece)}
					{originalRoute && originalRoute !== result.route
						? `. Antes de tu política: ${ROUTE_LABEL[originalRoute]}`
						: ""}
				</p>
			</header>

			{image ? (
				<Image
					src={image}
					alt={
						piece.imageDataUrl
							? `Captura enviada: ${piece.title}`
							: `Imagen de la pieza: ${piece.title}`
					}
					width={1200}
					height={900}
					unoptimized
					className="max-h-80 w-full rounded-[20px] bg-surface-muted object-contain"
				/>
			) : null}

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

			<section aria-labelledby="detail-reasons" className="grid gap-3">
				<h3 id="detail-reasons" className="text-sm font-medium">
					{needsEditor
						? "Por qué te llega"
						: result.route === "AUTO_APPROVE"
							? "Por qué se aprobó sola"
							: "Por qué se descartó"}
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

			{suggestions && !decided && needsEditor ? (
				<SuggestionsCard suggestions={suggestions} />
			) : null}
			{enrichState?.status === "error" ? (
				<p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
					{enrichState.message}
				</p>
			) : null}

			{decided ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-pill p-4 pl-5">
					<p className="text-sm font-medium text-pill-ink">{EDITOR_ACTION_LABEL[decided]}</p>
					<button type="button" onClick={() => setEditorAction(id, null)} className={secondary}>
						Deshacer
					</button>
				</div>
			) : needsEditor ? (
				<div className="flex flex-wrap gap-2">
					{suggestions ? (
						<button type="button" onClick={() => resolve("adjusted")} className={primary}>
							<CheckIcon size={18} />
							Aprobar con mejoras
						</button>
					) : (
						<button type="button" onClick={() => resolve("approved")} className={primary}>
							<CheckIcon size={18} />
							Aprobar
						</button>
					)}
					<button type="button" onClick={() => resolve("rejected")} className={secondary}>
						<CloseIcon size={18} />
						Rechazar
					</button>
					{suggestions ? (
						<button type="button" onClick={() => resolve("approved")} className={secondary}>
							Aprobar sin cambios
						</button>
					) : canEnrich ? (
						<button
							type="button"
							onClick={() => void enrich(id)}
							disabled={enriching}
							aria-busy={enriching}
							className={ai}
						>
							<SparkleIcon size={18} />
							{enriching ? "Pidiendo ideas a la IA…" : "Sugerir ajustes con IA"}
						</button>
					) : null}
				</div>
			) : (
				<p className="rounded-[20px] bg-surface-muted px-5 py-4 text-sm text-ink-muted">
					{result.route === "AUTO_APPROVE"
						? "Se aprobó sola. No tienes que hacer nada."
						: "Se descartó sola. No tienes que hacer nada."}
				</p>
			)}

			{piece.body ? (
				<details className="group rounded-[20px] border border-line">
					<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
						Ver texto completo
						<ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
					</summary>
					<p className="whitespace-pre-line border-t border-line px-5 py-4 text-sm leading-relaxed">
						{piece.body}
					</p>
				</details>
			) : null}

			<details className="group rounded-[20px] border border-line">
				<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm text-ink-muted [&::-webkit-details-marker]:hidden">
					Ver detalle técnico
					<ChevronDownIcon size={18} className="transition-transform group-open:rotate-180" />
				</summary>
				<div className="grid gap-5 border-t border-line px-5 py-4">
					{result.error ? <p className="text-sm text-danger">{result.error}</p> : null}
					{hasAnswers ? (
						<div className="grid gap-2">
							<h3 className="text-xs text-ink-muted">Respuestas de {providerName ?? "JEV"}</h3>
							<AnswerList
								answers={result.answers}
								policy={policy}
								brand={brandForResult(result, sessionBrand)}
							/>
						</div>
					) : (
						<p className="text-sm text-ink-muted">Ningún modelo respondió para esta pieza.</p>
					)}
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
						{facts.map((fact) => (
							<div key={fact.label} className="grid min-w-0 gap-0.5">
								<dt className="text-xs text-ink-muted">{fact.label}</dt>
								<dd className="break-words font-mono text-xs tabular-nums">{fact.value}</dd>
							</div>
						))}
					</dl>
				</div>
			</details>
		</article>
	);
}
