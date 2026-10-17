"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import {
	ghostButton,
	linkButton,
	primaryButton,
	secondaryButton,
	softInput,
} from "@/shared/ui/button-styles";
import { CalendarIcon, DownloadIcon, FileIcon } from "@/shared/ui/icons";
import {
	GRID_FIELD_LABEL,
	GRID_FIELDS,
	GRID_TEMPLATE_ROWS,
	type GridRow,
} from "../domain/content-grid";
import { GridDropZone } from "./grid-drop-zone";
import { GridPreviewTable } from "./grid-preview-table";
import { GridUploadResults } from "./grid-upload-results";
import {
	campaignFromFileName,
	downloadGridTemplate,
	GridFileError,
	readGridFile,
} from "./read-grid-file";
import {
	type BulkPieceInput,
	type BulkUploadResponse,
	messageOf,
	uploadGrid,
} from "./workspace-api";

type Phase =
	| { step: "pick"; reading: boolean }
	| { step: "preview"; fileName: string; rows: GridRow[]; ignoredColumns: string[] }
	| { step: "sending"; fileName: string; rows: GridRow[]; count: number }
	| { step: "done"; result: BulkUploadResponse; sentTitles: string[] };

/** Rough review time per piece with 8 in parallel, for the waiting message. */
const SECONDS_PER_PIECE = 0.6;

function selectableIndexes(rows: GridRow[]): Set<number> {
	return new Set(rows.flatMap((row, index) => (row.error ? [] : [index])));
}

function toBulkPiece(row: GridRow): BulkPieceInput {
	return {
		title: row.title,
		body: row.body,
		format: row.format,
		channel: row.channel,
		...(row.scheduledFor ? { scheduledFor: row.scheduledFor } : {}),
		...(row.notes ? { notes: row.notes } : {}),
	};
}

/** "Así debe verse tu grilla": the header and two example rows of the template. */
function GridExample() {
	return (
		<section aria-labelledby="grid-example-title" className="grid grid-cols-[minmax(0,1fr)] gap-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="grid-example-title" className="text-lg font-normal">
					Así debe verse tu grilla
				</h2>
				<p className="text-xs text-ink-muted">
					Solo «texto» es obligatoria. Los nombres pueden ir con o sin tilde.
				</p>
			</div>
			<div className="overflow-x-auto rounded-card border border-line">
				<table className="w-full min-w-[640px] border-collapse text-left text-xs">
					<thead>
						<tr className="bg-surface-muted">
							{GRID_FIELDS.map((field) => (
								<th key={field} scope="col" className="px-3 py-2.5 font-medium">
									{GRID_FIELD_LABEL[field]}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{GRID_TEMPLATE_ROWS.slice(0, 2).map((row) => (
							<tr key={row.join("|")} className="border-t border-line align-top">
								{row.map((cell, index) => (
									<td
										key={GRID_FIELDS[index]}
										className={`px-3 py-2.5 ${index === 2 ? "max-w-64" : "whitespace-nowrap"} ${
											cell ? "" : "text-ink-muted"
										}`}
									>
										<span className={index === 2 ? "line-clamp-2" : ""}>{cell || "(vacío)"}</span>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<ul className="grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
				<li>
					<span className="text-ink">fecha:</span> dd/mm/aaaa o aaaa-mm-dd (también fechas de Excel)
				</li>
				<li>
					<span className="text-ink">formato:</span> post, carrusel, reel, video, historia, guion,
					newsletter
				</li>
				<li>
					<span className="text-ink">canal:</span> Instagram, LinkedIn, YouTube, X (Twitter),
					newsletter, blog
				</li>
				<li>
					<span className="text-ink">titulo:</span> si falta, usamos la primera línea del texto
				</li>
			</ul>
		</section>
	);
}

/** /campana/cargar: upload a content grid (Excel or CSV), preview it and review it with JEV. */
export function GridUploadView() {
	const campaignId = useId();
	const [phase, setPhase] = useState<Phase>({ step: "pick", reading: false });
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [campaign, setCampaign] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onFile(file: File) {
		setError(null);
		setPhase({ step: "pick", reading: true });
		try {
			const parsed = await readGridFile(file);
			if (parsed.error) {
				setError(parsed.error);
				setPhase({ step: "pick", reading: false });
				return;
			}
			setSelected(selectableIndexes(parsed.rows));
			setCampaign(campaignFromFileName(file.name));
			setPhase({
				step: "preview",
				fileName: file.name,
				rows: parsed.rows,
				ignoredColumns: parsed.ignoredColumns,
			});
		} catch (cause) {
			setError(
				cause instanceof GridFileError
					? cause.message
					: "No pudimos leer el archivo. Intenta de nuevo.",
			);
			setPhase({ step: "pick", reading: false });
		}
	}

	function reset() {
		setError(null);
		setSelected(new Set());
		setCampaign("");
		setPhase({ step: "pick", reading: false });
	}

	async function send(fileName: string, rows: GridRow[]) {
		const chosen = rows.filter((row, index) => selected.has(index) && !row.error);
		if (chosen.length === 0) return;
		setError(null);
		setPhase({ step: "sending", fileName, rows, count: chosen.length });
		try {
			const result = await uploadGrid({
				...(campaign.trim() ? { campaign: campaign.trim() } : {}),
				pieces: chosen.map(toBulkPiece),
			});
			setPhase({ step: "done", result, sentTitles: chosen.map((row) => row.title) });
		} catch (cause) {
			setError(messageOf(cause));
			setPhase({ step: "preview", fileName, rows, ignoredColumns: [] });
		}
	}

	const header = (
		<PageHeader
			title="Carga tu grilla"
			description="Sube el Excel o CSV de tu campaña. JEV revisa cada pieza con tu marca y la deja en tu calendario, sin copiar y pegar."
			actions={
				<button type="button" onClick={downloadGridTemplate} className={secondaryButton}>
					<DownloadIcon size={18} />
					Descargar plantilla
				</button>
			}
		/>
	);

	const errorNote = error ? (
		<p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
			{error}
		</p>
	) : null;

	if (phase.step === "done") {
		return (
			<>
				{header}
				<GridUploadResults
					result={phase.result}
					sentTitles={phase.sentTitles}
					onUploadAnother={reset}
				/>
			</>
		);
	}

	if (phase.step === "pick") {
		return (
			<>
				{header}
				<div className="grid grid-cols-[minmax(0,1fr)] gap-8">
					<div className="grid grid-cols-[minmax(0,1fr)] gap-3">
						<GridDropZone onFile={(file) => void onFile(file)} busy={phase.reading} />
						{errorNote}
					</div>
					<GridExample />
					<p className="text-sm text-ink-muted">
						¿Ya cargaste una?{" "}
						<Link href="/campana" className={linkButton}>
							Ver tu campaña
						</Link>
					</p>
				</div>
			</>
		);
	}

	const { rows, fileName } = phase;
	const sending = phase.step === "sending";
	const valid = rows.filter((row) => !row.error).length;
	const withErrors = rows.length - valid;
	const withWarnings = rows.filter((row) => !row.error && row.warnings.length > 0).length;
	const count = [...selected].filter((index) => !rows[index]?.error).length;
	const ignored = phase.step === "preview" ? phase.ignoredColumns : [];

	return (
		<>
			{header}
			<div className="grid grid-cols-[minmax(0,1fr)] gap-5">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-muted px-4 py-3 sm:px-5">
					<p className="flex min-w-0 items-center gap-3">
						<span
							aria-hidden="true"
							className="grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-aqua-from to-aqua-to"
						>
							<FileIcon size={20} />
						</span>
						<span className="grid min-w-0">
							<span className="truncate text-sm font-medium">{fileName}</span>
							<span className="text-xs text-ink-muted">
								{rows.length} {rows.length === 1 ? "fila" : "filas"} · {valid}{" "}
								{valid === 1 ? "lista" : "listas"}
								{withWarnings > 0 ? ` · ${withWarnings} con avisos` : ""}
								{withErrors > 0
									? ` · ${withErrors} no se ${withErrors === 1 ? "revisa" : "revisan"}`
									: ""}
							</span>
						</span>
					</p>
					<button type="button" onClick={reset} disabled={sending} className={ghostButton}>
						Cambiar archivo
					</button>
				</div>

				<div className="grid gap-1.5 sm:max-w-md">
					<label htmlFor={campaignId} className="text-sm font-medium">
						Nombre de la campaña <span className="font-normal text-ink-muted">(opcional)</span>
					</label>
					<input
						id={campaignId}
						value={campaign}
						onChange={(event) => setCampaign(event.target.value)}
						maxLength={120}
						disabled={sending}
						placeholder="Ej.: Lanzamiento octubre"
						className={softInput}
					/>
				</div>

				{ignored.length > 0 ? (
					<p className="text-xs text-ink-muted">
						Ignoramos estas columnas: {ignored.map((name) => `«${name}»`).join(", ")}.
					</p>
				) : null}

				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-ink-muted">
						{count} de {valid} seleccionadas
					</span>
					<button
						type="button"
						onClick={() => setSelected(selectableIndexes(rows))}
						disabled={sending}
						className={ghostButton}
					>
						Seleccionar todas
					</button>
					<button
						type="button"
						onClick={() => setSelected(new Set())}
						disabled={sending}
						className={ghostButton}
					>
						Ninguna
					</button>
				</div>

				<GridPreviewTable
					rows={rows}
					selected={selected}
					disabled={sending}
					onToggle={(index) =>
						setSelected((current) => {
							const next = new Set(current);
							if (next.has(index)) next.delete(index);
							else next.add(index);
							return next;
						})
					}
				/>

				{errorNote}

				{sending ? (
					<div
						role="status"
						className="grid gap-1 rounded-card bg-linear-to-br from-lilac-from to-lilac-to px-5 py-4"
					>
						<p className="text-sm font-medium motion-safe:animate-pulse">
							JEV está revisando {phase.count} {phase.count === 1 ? "pieza" : "piezas"} con tu
							marca…
						</p>
						<p className="text-xs text-ink/70">
							Suele tardar unos {Math.max(5, Math.round(phase.count * SECONDS_PER_PIECE))} segundos.
							No cierres esta pestaña.
						</p>
					</div>
				) : null}

				<div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 sm:bottom-28 lg:bottom-4">
					<button
						type="button"
						onClick={() => void send(fileName, rows)}
						disabled={sending || count === 0}
						aria-busy={sending}
						className={`${primaryButton} shadow-[0_8px_24px_-12px_rgb(0_0_0/0.45)]`}
					>
						<CalendarIcon size={18} />
						{sending
							? "Revisando…"
							: `Revisar ${count} ${count === 1 ? "pieza" : "piezas"} con JEV`}
					</button>
				</div>
			</div>
		</>
	);
}
