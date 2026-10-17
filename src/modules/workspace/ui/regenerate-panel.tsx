"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { friendlyReasons } from "@/modules/content-review/ui/labels";
import { RouteBadge } from "@/modules/content-review/ui/route-badge";
import { ghostButton, primaryButton } from "@/shared/ui/button-styles";
import { CopyActions } from "@/shared/ui/copy-actions";
import { SparkleIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import {
	type RegenerationProposal,
	STATUS_FROM_ROUTE,
	type WorkspacePiece,
} from "../domain/workspace";
import { PublishMenu } from "./publish-menu";
import { messageOf, regeneratePiece, regenerationErrorMessage, saveVersion } from "./workspace-api";

/** Text + image regeneration can take up to ~60 s; give it room before giving up. */
const TIMEOUT_MS = 120_000;
const STEP_MS = 6000;

const TEXT_STEPS = [
	"Reescribiendo con la voz de tu marca…",
	"Corrigiendo lo que marcó JEV…",
	"JEV está revisando la nueva versión…",
];

const IMAGE_STEPS = [
	"Reescribiendo con la voz de tu marca…",
	"Rediseñando la imagen con los colores de tu marca…",
	"Ajustando los textos de la imagen…",
	"JEV está revisando la nueva versión…",
	"Ya casi: las imágenes tardan un poco más…",
];

type State =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "proposal"; proposal: RegenerationProposal };

function LoadingCard({ withImage }: { withImage: boolean }) {
	const steps = withImage ? IMAGE_STEPS : TEXT_STEPS;
	const [step, setStep] = useState(0);
	useEffect(() => {
		const timer = window.setInterval(
			() => setStep((value) => Math.min(value + 1, steps.length - 1)),
			STEP_MS,
		);
		return () => window.clearInterval(timer);
	}, [steps.length]);

	return (
		<div
			role="status"
			className="grid gap-4 rounded-card bg-linear-to-br from-lilac-from/60 to-lilac-to/60 p-5 sm:p-6"
		>
			<p className="flex items-center gap-2 text-sm font-medium">
				<SparkleIcon size={18} className="motion-safe:animate-pulse" />
				{steps[step]}
			</p>
			<ol className="grid gap-1.5 text-xs text-ink/70">
				{steps.map((text, index) => (
					<li key={text} className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className={`size-1.5 rounded-full ${index <= step ? "bg-ink" : "bg-ink/25"}`}
						/>
						<span className={index <= step ? "text-ink" : ""}>{text}</span>
					</li>
				))}
			</ol>
			<p className="text-xs text-ink/60">
				{withImage
					? "Con imagen puede tardar hasta un minuto. No cierres esta página."
					: "Suele tardar unos segundos."}
			</p>
		</div>
	);
}

function Column({
	label,
	title,
	body,
	tone,
}: {
	label: string;
	title: string;
	body: string;
	tone: "plain" | "ai";
}) {
	return (
		<div
			className={`grid content-start gap-2 rounded-[20px] p-4 ${
				tone === "ai" ? "bg-linear-to-br from-lilac-from/40 to-lilac-to/40" : "bg-surface-muted"
			}`}
		>
			<p className="text-xs text-ink-muted">{label}</p>
			<p className="text-base font-medium leading-snug">{title}</p>
			{body ? <p className="whitespace-pre-line text-sm leading-relaxed">{body}</p> : null}
		</div>
	);
}

interface RegeneratePanelProps {
	piece: WorkspacePiece;
	onSaved: (piece: WorkspacePiece) => void;
}

/** "Regenerar con IA": ask for a rewrite, compare before/after with JEV's new verdict, save or discard. */
export function RegeneratePanel({ piece, onSaved }: RegeneratePanelProps) {
	const { notify } = useToast();
	const [state, setState] = useState<State>({ status: "idle" });
	const [saving, setSaving] = useState(false);
	const controllerRef = useRef<AbortController | null>(null);

	useEffect(() => () => controllerRef.current?.abort(), []);

	async function regenerate() {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
		setState({ status: "loading" });
		try {
			const proposal = await regeneratePiece(piece.id, controller.signal);
			setState({ status: "proposal", proposal });
		} catch (error) {
			if (controllerRef.current !== controller) return;
			setState({ status: "error", message: regenerationErrorMessage(error) });
		} finally {
			window.clearTimeout(timer);
		}
	}

	async function save(proposal: RegenerationProposal) {
		setSaving(true);
		try {
			const saved = await saveVersion(piece.id, {
				title: proposal.title,
				body: proposal.body,
				changes: proposal.changes,
				imageDataUrl: proposal.imageDataUrl,
			});
			setState({ status: "idle" });
			onSaved(saved);
			notify(`Guardamos la versión ${saved.version}`);
		} catch (error) {
			notify(messageOf(error));
		} finally {
			setSaving(false);
		}
	}

	if (state.status === "loading") return <LoadingCard withImage={Boolean(piece.imageUrl)} />;

	if (state.status === "proposal") {
		const { proposal } = state;
		const reasons = friendlyReasons(proposal.review);
		const proposalText = proposal.body ? `${proposal.title}\n\n${proposal.body}` : proposal.title;
		return (
			<section
				aria-labelledby="regen-title"
				className="grid gap-5 rounded-card border border-line p-5 sm:p-6"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 id="regen-title" className="flex items-center gap-2 text-base font-medium">
						<SparkleIcon size={18} />
						Propuesta de la IA
					</h2>
					<span className="text-xs text-ink-muted">Aún no se guardó</span>
				</div>

				{proposal.imageDataUrl && piece.imageUrl ? (
					<div className="grid gap-3 sm:grid-cols-2">
						<figure className="grid gap-2">
							<Image
								src={piece.imageUrl}
								alt={`Imagen original: ${piece.title}`}
								width={800}
								height={600}
								unoptimized
								className="max-h-72 w-full rounded-[18px] bg-surface-muted object-contain"
							/>
							<figcaption className="text-xs text-ink-muted">Imagen original</figcaption>
						</figure>
						<figure className="grid gap-2">
							<Image
								src={proposal.imageDataUrl}
								alt={`Imagen regenerada con IA: ${proposal.title}`}
								width={800}
								height={600}
								unoptimized
								className="max-h-72 w-full rounded-[18px] bg-surface-muted object-contain"
							/>
							<figcaption className="flex items-center gap-1.5 text-xs font-medium">
								<SparkleIcon size={14} />
								Imagen regenerada con IA
							</figcaption>
						</figure>
					</div>
				) : null}

				<div className="grid gap-3 sm:grid-cols-2">
					<Column label="Original" title={piece.title} body={piece.body} tone="plain" />
					<Column label="Propuesta" title={proposal.title} body={proposal.body} tone="ai" />
				</div>

				{proposal.changes.length > 0 ? (
					<div className="grid gap-2">
						<h3 className="text-sm font-medium">Qué cambió</h3>
						<ul className="grid gap-1.5 text-sm leading-relaxed">
							{proposal.changes.map((change) => (
								<li key={change} className="flex gap-2.5">
									<span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />
									{change}
								</li>
							))}
						</ul>
					</div>
				) : null}

				<div className="grid gap-2 rounded-[20px] bg-surface-muted p-4">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="text-sm font-medium">JEV revisó la nueva versión:</h3>
						<RouteBadge route={proposal.review.route} />
					</div>
					{reasons.length === 0 ? (
						<p className="text-sm text-ink-muted">Cumple todo lo que pide tu política.</p>
					) : (
						<ul className="grid gap-1 text-sm">
							{reasons.map((reason) => (
								<li key={reason} className="flex items-center gap-2.5">
									<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink" />
									{reason}
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="flex flex-wrap items-start gap-2">
					<PublishMenu
						enabled={STATUS_FROM_ROUTE[proposal.review.route] === "approved"}
						disabledHint="Guárdala y apruébala primero"
						text={proposalText}
						imageSrc={proposal.imageDataUrl}
						fileName="pieza-propuesta"
					/>
					<CopyActions
						text={proposalText}
						imageSrc={proposal.imageDataUrl}
						fileName="pieza-propuesta"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void save(proposal)}
						disabled={saving}
						aria-busy={saving}
						className={primaryButton}
					>
						{saving ? "Guardando…" : "Guardar como nueva versión"}
					</button>
					<button
						type="button"
						onClick={() => setState({ status: "idle" })}
						disabled={saving}
						className={ghostButton}
					>
						Descartar
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			aria-label="Regenerar con IA"
			className="grid gap-3 rounded-card bg-linear-to-br from-lilac-from/40 to-lilac-to/40 p-5 sm:p-6"
		>
			<div className="grid gap-1">
				<p className="text-base font-medium">¿Quieres que la IA la arregle?</p>
				<p className="text-sm text-ink/70">
					Reescribe {piece.imageUrl ? "el texto y la imagen" : "el texto"} con la voz de tu marca,
					corrigiendo solo lo que marcó JEV. Tú decides si la guardas.
				</p>
			</div>
			{state.status === "error" ? (
				<p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
					{state.message}
				</p>
			) : null}
			<button
				type="button"
				onClick={() => void regenerate()}
				className={`${primaryButton} justify-self-start`}
			>
				<SparkleIcon size={18} />
				{state.status === "error" ? "Intentar de nuevo" : "Regenerar con IA"}
			</button>
		</section>
	);
}
