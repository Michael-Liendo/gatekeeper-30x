import {
	GRID_LIMITS,
	type GridCell,
	type GridParseResult,
	gridTemplateCsv,
	parseCsvGrid,
	parseGridRows,
} from "../domain/content-grid";

/** Browser adapter: reads a .csv or .xlsx File and hands its rows to the pure grid parser. */

export const GRID_ACCEPT =
	".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export class GridFileError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GridFileError";
	}
}

function kindOf(file: File): "csv" | "xlsx" | null {
	const name = file.name.toLowerCase();
	if (name.endsWith(".csv")) return "csv";
	if (name.endsWith(".xlsx")) return "xlsx";
	if (name.endsWith(".xls")) {
		throw new GridFileError(
			"Ese es un Excel antiguo (.xls). Guárdalo como .xlsx o CSV y vuelve a subirlo.",
		);
	}
	return null;
}

async function readXlsx(file: File): Promise<GridCell[][]> {
	// Loaded on demand so the reader only ships to people who upload an Excel file.
	const { readSheet } = await import("read-excel-file/browser");
	return (await readSheet(file)) as unknown as GridCell[][];
}

/** Reads and normalizes a grid file. Throws GridFileError with a Spanish message. */
export async function readGridFile(file: File): Promise<GridParseResult> {
	const kind = kindOf(file);
	if (!kind) throw new GridFileError("Sube un archivo .xlsx (Excel) o .csv.");
	if (file.size > GRID_LIMITS.maxBytes) {
		throw new GridFileError("El archivo pesa más de 2 MB. Quita columnas o filas que no uses.");
	}
	try {
		if (kind === "csv") return parseCsvGrid(await file.text());
		return parseGridRows(await readXlsx(file));
	} catch (error) {
		if (error instanceof GridFileError) throw error;
		throw new GridFileError(
			kind === "xlsx"
				? "No pudimos leer el Excel. Ábrelo y guárdalo de nuevo como .xlsx, o expórtalo a CSV."
				: "No pudimos leer el CSV. Revisa que esté guardado en UTF-8.",
		);
	}
}

/** Campaign name suggested from the file name: "Grilla octubre.xlsx" → "Grilla octubre". */
export function campaignFromFileName(name: string): string {
	return name
		.replace(/\.(csv|xlsx)$/i, "")
		.replace(/[_]+/g, " ")
		.trim()
		.slice(0, 120);
}

/** Downloads the CSV template (with BOM so Excel reads the accents). */
export function downloadGridTemplate(): void {
	const blob = new Blob([`﻿${gridTemplateCsv()}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "plantilla-grilla.csv";
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
