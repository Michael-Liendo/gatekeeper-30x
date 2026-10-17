"use client";

import { type DragEvent, useId, useRef, useState } from "react";
import { FileIcon } from "@/shared/ui/icons";
import { GRID_ACCEPT } from "./read-grid-file";

interface GridDropZoneProps {
	onFile: (file: File) => void;
	busy?: boolean;
}

/** Big drop zone for the grid file: click to pick or drag and drop a .xlsx / .csv. */
export function GridDropZone({ onFile, busy = false }: GridDropZoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const hintId = useId();

	function handleDrop(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		setDragging(false);
		const file = event.dataTransfer.files[0];
		if (file && !busy) onFile(file);
	}

	return (
		<>
			<button
				type="button"
				disabled={busy}
				aria-busy={busy}
				aria-describedby={hintId}
				onClick={() => inputRef.current?.click()}
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
					className={`grid min-h-52 place-items-center content-center gap-2 rounded-[22px] px-6 py-8 transition-colors ${
						dragging ? "bg-surface/70" : "bg-surface group-hover:bg-surface/85"
					}`}
				>
					<span
						aria-hidden="true"
						className="grid size-12 place-items-center rounded-full bg-linear-to-br from-lilac-from to-lilac-to text-ink"
					>
						<FileIcon size={22} />
					</span>
					<span className="text-base font-medium">
						{busy ? "Leyendo tu grilla…" : "Arrastra tu grilla aquí o haz clic para elegirla"}
					</span>
					<span id={hintId} className="max-w-md text-xs text-ink-muted">
						Excel (.xlsx) o CSV · hasta 2 MB y 200 filas · la leemos en tu navegador
					</span>
				</span>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={GRID_ACCEPT}
				className="sr-only"
				tabIndex={-1}
				aria-hidden="true"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) onFile(file);
				}}
			/>
		</>
	);
}
