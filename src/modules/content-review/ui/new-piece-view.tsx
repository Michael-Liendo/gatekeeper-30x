"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { ImageDropZone } from "@/shared/ui/image-drop-zone";
import type { ContentChannel, ContentFormat } from "../domain/content-piece";
import { errorMessage } from "./api";
import { CHANNEL_LABEL, FORMAT_LABEL } from "./labels";
import { PageHeader } from "./page-header";
import { PieceDetail } from "./piece-detail";
import { useReview } from "./review-session-provider";

const FORMATS = Object.keys(FORMAT_LABEL) as ContentFormat[];
const CHANNELS = Object.keys(CHANNEL_LABEL) as ContentChannel[];
const IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BODY = 4000;

const field =
	"w-full rounded-2xl border border-line bg-surface-muted px-4 text-sm focus-visible:border-ink focus-visible:bg-surface";

/** Submit a piece to the gatekeeper: a screenshot, its text, or both. */
export function NewPieceView() {
	const { submit, results } = useReview();
	const id = useId();
	const [image, setImage] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [format, setFormat] = useState<ContentFormat>("post");
	const [channel, setChannel] = useState<ContentChannel>("linkedin");
	const [error, setError] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const [lastId, setLastId] = useState<string | null>(null);

	// Read the result from the shared state so it follows policy changes and editor actions.
	const last = lastId ? (results.find((r) => r.piece.id === lastId) ?? null) : null;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const text = body.trim();
		if (!image && text.length === 0) {
			setError("Sube una captura o pega el texto de la pieza.");
			return;
		}
		setError(null);
		setSending(true);
		try {
			const result = await submit({
				title: title.trim() || undefined,
				body: text || undefined,
				imageDataUrl: image ?? undefined,
				format,
				channel,
			});
			setLastId(result.piece.id);
			setImage(null);
			setTitle("");
			setBody("");
		} catch (submitError) {
			setError(errorMessage(submitError));
		} finally {
			setSending(false);
		}
	}

	const needsEditor = last && (last.route === "HUMAN_REVIEW" || last.route === "ENRICH_WITH_LLM");

	return (
		<>
			<PageHeader
				title="Sube una pieza para revisar"
				description="Una captura, el texto o ambos. En segundos sabrás si se aprueba sola o si necesita tu ojo."
			/>
			<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:gap-10">
				<form
					onSubmit={handleSubmit}
					noValidate
					className="grid gap-5"
					aria-describedby={error ? `${id}-error` : undefined}
				>
					<fieldset className="grid gap-2">
						<legend className="sr-only">Captura</legend>
						<ImageDropZone
							value={image}
							onChange={(value) => {
								setImage(value);
								setError(null);
							}}
							onError={setError}
							accept={IMAGE_TYPES}
							maxBytes={MAX_IMAGE_BYTES}
							label="Arrastra o elige una captura"
							hint="PNG o JPG de hasta 4 MB. También puedes pegarla con Ctrl+V o Cmd+V."
							disabled={sending}
						/>
					</fieldset>

					<div className="grid gap-1">
						<label htmlFor={`${id}-body`} className="text-sm font-medium">
							Texto <span className="font-normal text-ink-muted">(opcional si subes captura)</span>
						</label>
						<textarea
							id={`${id}-body`}
							value={body}
							onChange={(e) => setBody(e.target.value)}
							rows={6}
							maxLength={MAX_BODY}
							className={`${field} py-3 leading-relaxed`}
						/>
						<p className="text-right text-xs text-ink-muted tabular-nums">
							{body.length}/{MAX_BODY}
						</p>
					</div>

					<div className="grid gap-1">
						<label htmlFor={`${id}-title`} className="text-sm font-medium">
							Título <span className="font-normal text-ink-muted">(opcional)</span>
						</label>
						<input
							id={`${id}-title`}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={200}
							placeholder="Captura sin título"
							className={`${field} min-h-11`}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-1">
							<label htmlFor={`${id}-format`} className="text-sm font-medium">
								Formato
							</label>
							<select
								id={`${id}-format`}
								value={format}
								onChange={(e) => setFormat(e.target.value as ContentFormat)}
								className={`${field} min-h-11`}
							>
								{FORMATS.map((value) => (
									<option key={value} value={value}>
										{FORMAT_LABEL[value]}
									</option>
								))}
							</select>
						</div>
						<div className="grid gap-1">
							<label htmlFor={`${id}-channel`} className="text-sm font-medium">
								Canal
							</label>
							<select
								id={`${id}-channel`}
								value={channel}
								onChange={(e) => setChannel(e.target.value as ContentChannel)}
								className={`${field} min-h-11`}
							>
								{CHANNELS.map((value) => (
									<option key={value} value={value}>
										{CHANNEL_LABEL[value]}
									</option>
								))}
							</select>
						</div>
					</div>

					{error ? (
						<p
							id={`${id}-error`}
							role="alert"
							className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger"
						>
							{error}
						</p>
					) : null}

					<button
						type="submit"
						disabled={sending}
						aria-busy={sending}
						className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-ink hover:opacity-90 disabled:cursor-progress disabled:opacity-70 sm:justify-self-start"
					>
						{sending ? "Revisando…" : "Revisar pieza"}
					</button>
				</form>

				<div aria-live="polite" className="grid gap-3">
					{last ? (
						<>
							<p className="text-sm text-ink-muted">
								{needsEditor ? (
									<>
										También quedó en tu{" "}
										<Link href="/" className="font-medium text-ink underline underline-offset-2">
											bandeja
										</Link>
										. Puedes decidirla aquí mismo.
									</>
								) : (
									"Se resolvió sola. También la verás en Contenido."
								)}
							</p>
							<div className="rounded-card border border-line p-5 sm:p-7">
								<PieceDetail key={last.piece.id} result={last} />
							</div>
						</>
					) : (
						<div className="grid min-h-56 place-items-center rounded-card bg-surface-muted p-8 text-center text-sm text-ink-muted">
							{sending ? "Leyendo la pieza…" : "Aquí verás qué se decidió con tu pieza y por qué."}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
