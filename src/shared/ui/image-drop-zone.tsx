"use client";

import Image from "next/image";
import { type ClipboardEvent, type DragEvent, useId, useRef, useState } from "react";

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
			<div className="grid gap-2">
				<Image
					src={value}
					alt="Vista previa de la captura"
					width={1200}
					height={900}
					unoptimized
					className="max-h-72 w-full rounded-lg border border-line bg-surface-muted object-contain"
				/>
				<button
					type="button"
					onClick={() => onChange(null)}
					disabled={disabled}
					className="inline-flex min-h-11 items-center justify-self-start rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
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
				className={`grid min-h-40 w-full place-items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center ${
					dragging
						? "border-focus bg-suggest"
						: "border-line-strong bg-surface-muted hover:bg-surface"
				}`}
			>
				<span className="font-semibold">{label}</span>
				<span id={hintId} className="text-sm text-ink-muted">
					{hint}
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
