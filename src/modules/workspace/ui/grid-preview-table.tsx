"use client";

import { CHANNEL_LABEL, FORMAT_LABEL } from "@/modules/content-review/ui/labels";
import type { GridRow } from "../domain/content-grid";
import { formatScheduled } from "./workspace-labels";

interface GridPreviewTableProps {
	rows: GridRow[];
	selected: ReadonlySet<number>;
	onToggle: (index: number) => void;
	disabled?: boolean;
}

function RowStatus({ row }: { row: GridRow }) {
	if (row.error) {
		return (
			<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
				<span aria-hidden="true" className="size-2 rounded-full bg-danger" />
				No se revisa
			</span>
		);
	}
	if (row.warnings.length > 0) {
		return (
			<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-human-soft px-2.5 py-1 text-xs font-medium text-human-ink">
				<span aria-hidden="true" className="size-2 rounded-full bg-human" />
				Con avisos
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-approve-soft px-2.5 py-1 text-xs font-medium text-approve-ink">
			<span aria-hidden="true" className="size-2 rounded-full bg-approve" />
			Lista
		</span>
	);
}

/** Preview of the parsed grid: one row per piece, with a checkbox and inline warnings. */
export function GridPreviewTable({ rows, selected, onToggle, disabled }: GridPreviewTableProps) {
	return (
		<div className="overflow-x-auto rounded-card border border-line">
			<table className="w-full min-w-[640px] border-collapse text-left text-sm">
				<caption className="sr-only">Piezas encontradas en la grilla</caption>
				<thead>
					<tr className="border-b border-line text-xs text-ink-muted">
						<th scope="col" className="w-12 px-4 py-3 font-normal">
							<span className="sr-only">Incluir</span>
						</th>
						<th scope="col" className="px-2 py-3 font-normal">
							Fecha
						</th>
						<th scope="col" className="px-2 py-3 font-normal">
							Pieza
						</th>
						<th scope="col" className="px-2 py-3 font-normal">
							Formato
						</th>
						<th scope="col" className="px-2 py-3 font-normal">
							Canal
						</th>
						<th scope="col" className="px-4 py-3 font-normal">
							Estado
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => {
						const id = `grid-row-${index}`;
						const notes = row.error ? [row.error, ...row.warnings] : row.warnings;
						return (
							<tr
								key={row.line}
								className={`border-b border-line align-top last:border-b-0 ${
									row.error ? "bg-surface-muted/60" : ""
								}`}
							>
								<td className="px-4 py-3">
									<input
										id={id}
										type="checkbox"
										checked={selected.has(index)}
										disabled={disabled || Boolean(row.error)}
										onChange={() => onToggle(index)}
										className="size-4 accent-[var(--primary)]"
									/>
								</td>
								<td className="whitespace-nowrap px-2 py-3 text-ink-muted">
									{row.scheduledFor ? (
										<time dateTime={row.scheduledFor} className="text-ink">
											{formatScheduled(row.scheduledFor)}
										</time>
									) : (
										"Sin fecha"
									)}
								</td>
								<td className="max-w-80 px-2 py-3">
									<label htmlFor={id} className="grid gap-1">
										<span className="line-clamp-2 font-medium">{row.title}</span>
										{row.body ? (
											<span className="line-clamp-1 text-xs text-ink-muted">{row.body}</span>
										) : null}
									</label>
									{notes.length > 0 ? (
										<ul className="mt-1.5 grid gap-0.5 text-xs">
											{notes.map((note) => (
												<li
													key={note}
													className={note === row.error ? "text-danger" : "text-human-ink"}
												>
													{note}
												</li>
											))}
										</ul>
									) : null}
									<span className="sr-only">Fila {row.line} del archivo</span>
								</td>
								<td className="whitespace-nowrap px-2 py-3">{FORMAT_LABEL[row.format]}</td>
								<td className="whitespace-nowrap px-2 py-3">{CHANNEL_LABEL[row.channel]}</td>
								<td className="px-4 py-3">
									<RowStatus row={row} />
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
