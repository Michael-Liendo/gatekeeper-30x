"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { GridUploadSoon } from "@/modules/workspace/ui/grid-upload-soon";
import { createPiece } from "@/modules/workspace/ui/workspace-api";
import { ChevronDownIcon } from "@/shared/ui/icons";
import { ImageDropZone } from "@/shared/ui/image-drop-zone";
import type { ContentChannel, ContentFormat } from "../domain/content-piece";
import { CHANNEL_LABEL, FORMAT_LABEL } from "./labels";
import { PageHeader } from "./page-header";
import { useReview } from "./review-session-provider";

const FORMATS = Object.keys(FORMAT_LABEL) as ContentFormat[];
const CHANNELS = Object.keys(CHANNEL_LABEL) as ContentChannel[];
const IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BODY = 4000;

const field =
	"w-full rounded-2xl border border-line bg-surface-muted px-4 text-sm focus-visible:border-ink focus-visible:bg-surface";

/** First words of the text, so a text-only piece doesn't show up as "Captura sin título". */
function titleFromText(text: string): string | undefined {
	if (!text) return undefined;
	const firstLine = text.split("\n")[0].trim();
	return firstLine.length > 70 ? `${firstLine.slice(0, 67).trimEnd()}…` : firstLine;
}

/** Full-page form to submit a piece (screenshot, text or both); opens its result page. */
export function NewPieceView() {
	const router = useRouter();
	const { refreshWorkspace } = useReview();
	const id = useId();
	const [image, setImage] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [format, setFormat] = useState<ContentFormat>("post");
	const [channel, setChannel] = useState<ContentChannel>("linkedin");
	const [error, setError] = useState<string | null>(null);
	const [sending, setSending] = useState(false);

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
			const piece = await createPiece({
				title: title.trim() || titleFromText(text),
				body: text || undefined,
				imageDataUrl: image ?? undefined,
				format,
				channel,
			});
			void refreshWorkspace();
			router.push(`/pieza/${encodeURIComponent(piece.id)}`);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Ocurrió un error inesperado. Reintenta en unos segundos.",
			);
			setSending(false);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-2 sm:py-4">
			<PageHeader
				title="Sube una pieza para revisar"
				description="Una captura, el texto o ambos. En segundos sabrás si está lista y la verás en el tablero del equipo."
				className="mb-3 sm:mb-4"
			/>
			<div className="mb-3 sm:mb-4">
				<GridUploadSoon size="sm" />
			</div>
			<form
				onSubmit={handleSubmit}
				noValidate
				className="grid gap-3 sm:gap-3.5"
				aria-busy={sending}
				aria-describedby={error ? `${id}-error` : undefined}
			>
				<fieldset className="grid gap-1">
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
					<div className="flex items-baseline justify-between gap-2">
						<label htmlFor={`${id}-body`} className="text-xs sm:text-sm font-medium">
							Texto <span className="font-normal text-ink-muted">(opcional si subes captura)</span>
						</label>
						<span className="text-xs text-ink-muted tabular-nums">
							{body.length}/{MAX_BODY}
						</span>
					</div>
					<textarea
						id={`${id}-body`}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						rows={3}
						maxLength={MAX_BODY}
						className={`${field} min-h-[72px] py-2.5 leading-relaxed resize-y`}
					/>
				</div>

				<div className="grid gap-1">
					<label htmlFor={`${id}-title`} className="text-xs sm:text-sm font-medium">
						Título <span className="font-normal text-ink-muted">(opcional)</span>
					</label>
					<input
						id={`${id}-title`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						maxLength={200}
						placeholder="Captura sin título"
						className={`${field} h-10 min-h-10`}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid gap-1">
						<label htmlFor={`${id}-format`} className="text-xs sm:text-sm font-medium">
							Formato
						</label>
						<div className="relative">
							<select
								id={`${id}-format`}
								value={format}
								onChange={(e) => setFormat(e.target.value as ContentFormat)}
								className={`${field} h-10 min-h-10 appearance-none pr-10`}
							>
								{FORMATS.map((value) => (
									<option key={value} value={value}>
										{FORMAT_LABEL[value]}
									</option>
								))}
							</select>
							<span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
								<ChevronDownIcon size={16} />
							</span>
						</div>
					</div>
					<div className="grid gap-1">
						<label htmlFor={`${id}-channel`} className="text-xs sm:text-sm font-medium">
							Canal
						</label>
						<div className="relative">
							<select
								id={`${id}-channel`}
								value={channel}
								onChange={(e) => setChannel(e.target.value as ContentChannel)}
								className={`${field} h-10 min-h-10 appearance-none pr-10`}
							>
								{CHANNELS.map((value) => (
									<option key={value} value={value}>
										{CHANNEL_LABEL[value]}
									</option>
								))}
							</select>
							<span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
								<ChevronDownIcon size={16} />
							</span>
						</div>
					</div>
				</div>

				{error ? (
					<p
						id={`${id}-error`}
						role="alert"
						className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger"
					>
						{error}
					</p>
				) : null}

				<button
					type="submit"
					disabled={sending}
					aria-busy={sending}
					className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-ink hover:opacity-90 disabled:cursor-progress disabled:opacity-70 sm:w-auto sm:justify-self-end mt-0.5"
				>
					{sending ? "Revisando tu pieza…" : "Revisar pieza"}
				</button>
				<p aria-live="polite" className="sr-only">
					{sending ? "Revisando tu pieza, en unos segundos verás el resultado." : ""}
				</p>
			</form>
		</div>
	);
}
