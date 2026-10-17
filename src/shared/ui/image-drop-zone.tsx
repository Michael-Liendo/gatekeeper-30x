"use client";

import Image from "next/image";
import { type ClipboardEvent, type DragEvent, useId, useRef, useState } from "react";
import { UploadIcon } from "./icons";

interface ImageDropZoneProps {
	/** Current image as a data URL, or null. */
	value: string | null;
	onChange: (dataUrl: string | null) => void;
	onError: (message: string) => void;
	/** MIME types accepted, e.g. ["image/png", "image/jpeg"]. */
	accept: readonly string[];
	maxBytes: number;
	label: string;
	hint: string;
	disabled?: boolean;
}

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("empty"));
		reader.onerror = () => reject(reader.error ?? new Error("read failed"));
		reader.readAsDataURL(file);
	});
}

/**
 * Upload zone for one image: click to pick, drag and drop, or paste from the
 * clipboard while the zone has focus. Shows a preview with a remove button.
 */
export function ImageDropZone({
	value,
	onChange,
	onError,
	accept,
	maxBytes,
	label,
	hint,
	disabled = false,
}: ImageDropZoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const hintId = useId();
	const maxMb = Math.round(maxBytes / (1024 * 1024));

	async function acceptFile(file: File | null | undefined) {
		if (!file) return;
		if (!accept.includes(file.type)) {
			onError("Formato no admitido. Sube una captura en PNG o JPG.");
			return;
		}
		if (file.size > maxBytes) {
			onError(`La imagen pesa más de ${maxMb} MB. Recórtala o comprímela e inténtalo de nuevo.`);
			return;
		}
		try {
			onChange(await readAsDataUrl(file));
		} catch {
			onError("No se pudo leer la imagen. Prueba con otro archivo.");
		}
	}

	function handleDrop(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		setDragging(false);
		if (!disabled) void acceptFile(event.dataTransfer.files[0]);
	}

	function handlePaste(event: ClipboardEvent<HTMLButtonElement>) {
		const item = Array.from(event.clipboardData.items).find((i) => i.kind === "file");
		if (!item) return;
		event.preventDefault();
		if (!disabled) void acceptFile(item.getAsFile());
	}

	if (value) {
		return (
			<div className="relative group overflow-hidden rounded-card bg-surface-muted">
				<Image
					src={value}
					alt="Vista previa de la captura"
					width={1200}
					height={900}
					unoptimized
					className="max-h-36 sm:max-h-40 w-full object-contain"
				/>
				<button
					type="button"
					onClick={() => onChange(null)}
					disabled={disabled}
					className="absolute top-2.5 right-2.5 inline-flex h-8 items-center rounded-full border border-line-strong bg-surface/95 px-3 text-xs font-medium text-ink shadow-xs backdrop-blur hover:bg-surface"
				>
					Quitar captura
				</button>
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				disabled={disabled}
				aria-describedby={hintId}
				onClick={() => inputRef.current?.click()}
				onPaste={handlePaste}
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={handleDrop}
				className={`group block w-full rounded-card bg-linear-to-br p-[2px] text-center disabled:cursor-progress ${
					dragging
						? "from-lilac-to via-lilac-from to-aqua-to"
						: "from-lilac-from via-lilac-to to-aqua-from"
				}`}
			>
				<span
					className={`grid min-h-20 sm:min-h-24 place-items-center content-center gap-1 sm:gap-1.5 rounded-[18px] px-4 py-2.5 sm:py-3 transition-colors ${
						dragging ? "bg-surface/70" : "bg-surface group-hover:bg-surface/85"
					}`}
				>
					<span
						aria-hidden="true"
						className="grid size-8 sm:size-9 place-items-center rounded-full bg-linear-to-br from-lilac-from to-lilac-to text-primary-ink"
					>
						<UploadIcon size={18} />
					</span>
					<span className="text-xs sm:text-sm font-medium">{label}</span>
					<span id={hintId} className="max-w-md text-[0.6875rem] sm:text-xs text-ink-muted">
						{hint}
					</span>
				</span>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={accept.join(",")}
				className="sr-only"
				tabIndex={-1}
				aria-hidden="true"
				onChange={(event) => {
					void acceptFile(event.target.files?.[0]);
					event.target.value = "";
				}}
			/>
		</>
	);
}
