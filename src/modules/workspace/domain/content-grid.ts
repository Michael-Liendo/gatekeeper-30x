import type { ContentChannel, ContentFormat } from "../../content-review/domain/content-piece";

/**
 * Content grid ("la grilla"): the spreadsheet a team plans its campaign in. Pure
 * functions to read it (CSV text or rows already read from an .xlsx), map its columns
 * and normalize every row into a piece ready to be reviewed. No browser or Node APIs.
 */

/** Limits of one upload. Data, not code: tune them here. */
export const GRID_LIMITS = {
	maxBytes: 2 * 1024 * 1024,
	maxRows: 200,
	maxTitleLength: 300,
	maxBodyLength: 4000,
	maxNotesLength: 500,
	/** Title made from the first line of the text is cut to this length. */
	derivedTitleLength: 80,
} as const;

/** A cell as it comes from a CSV (string) or an .xlsx reader (number, Date, boolean…). */
export type GridCell = string | number | boolean | Date | null | undefined;

/** Columns the grid understands. */
export type GridField = "date" | "title" | "body" | "format" | "channel" | "notes";

export const GRID_FIELDS: readonly GridField[] = [
	"date",
	"title",
	"body",
	"format",
	"channel",
	"notes",
];

/** Column names accepted for each field, already normalized (lowercase, no accents). */
export const GRID_COLUMN_SYNONYMS: Readonly<Record<GridField, readonly string[]>> = {
	date: ["fecha", "date", "dia", "publicacion", "fecha de publicacion", "fecha publicacion", "day"],
	title: ["titulo", "title", "tema", "nombre", "asunto"],
	body: ["texto", "copy", "caption", "body", "descripcion", "contenido", "text"],
	format: ["formato", "format", "tipo", "tipo de contenido", "type"],
	channel: ["canal", "red", "channel", "plataforma", "red social", "redes", "network"],
	notes: ["notas", "nota", "comentarios", "comentario", "notes", "observaciones"],
};

/** Spanish name of each column, for messages and the template. */
export const GRID_FIELD_LABEL: Readonly<Record<GridField, string>> = {
	date: "fecha",
	title: "titulo",
	body: "texto",
	format: "formato",
	channel: "canal",
	notes: "notas",
};

/** Accepted values for formato (normalized) → content format. */
export const GRID_FORMAT_ALIASES: Readonly<Record<string, ContentFormat>> = {
	post: "post",
	posteo: "post",
	publicacion: "post",
	carrusel: "post",
	carousel: "post",
	imagen: "post",
	foto: "post",
	reel: "clip",
	reels: "clip",
	video: "clip",
	clip: "clip",
	short: "clip",
	shorts: "clip",
	historia: "clip",
	historias: "clip",
	story: "clip",
	stories: "clip",
	guion: "video_script",
	"guion de video": "video_script",
	script: "video_script",
	"video script": "video_script",
	video_script: "video_script",
	newsletter: "newsletter",
	boletin: "newsletter",
	email: "newsletter",
	"e mail": "newsletter",
	correo: "newsletter",
	mail: "newsletter",
};

/** Accepted values for canal (normalized) → content channel, with an optional warning. */
export const GRID_CHANNEL_ALIASES: Readonly<
	Record<string, { channel: ContentChannel; warning?: string }>
> = {
	instagram: { channel: "instagram" },
	ig: { channel: "instagram" },
	insta: { channel: "instagram" },
	linkedin: { channel: "linkedin" },
	"linked in": { channel: "linkedin" },
	youtube: { channel: "youtube" },
	yt: { channel: "youtube" },
	x: { channel: "x" },
	twitter: { channel: "x" },
	"x twitter": { channel: "x" },
	newsletter: { channel: "newsletter" },
	email: { channel: "newsletter" },
	boletin: { channel: "newsletter" },
	correo: { channel: "newsletter" },
	blog: { channel: "blog" },
	web: { channel: "blog" },
	tiktok: {
		channel: "instagram",
		warning: "TikTok todavía no es un canal propio: la revisamos como Instagram.",
	},
};

/** Used when formato is empty or not recognized. */
export const DEFAULT_GRID_FORMAT: ContentFormat = "post";
/** Used when canal is empty or not recognized. */
export const DEFAULT_GRID_CHANNEL: ContentChannel = "instagram";

/** One row of the grid, normalized. `error` rows are shown but never sent. */
export interface GridRow {
	/** Line in the file (1-based, header included), to point people at the row. */
	line: number;
	title: string;
	body: string;
	format: ContentFormat;
	channel: ContentChannel;
	/** ISO date (yyyy-mm-dd) when the row has a valid date. */
	scheduledFor?: string;
	notes?: string;
	/** Things we fixed or guessed, in short Spanish sentences. */
	warnings: string[];
	/** Why the row cannot be reviewed (skipped). */
	error?: string;
}

export interface GridParseResult {
	rows: GridRow[];
	/** Column index per field found in the header. */
	columns: Partial<Record<GridField, number>>;
	/** Header cells we did not recognize (ignored). */
	ignoredColumns: string[];
	/** Whole-file problem (no texto column, too many rows…). When set, `rows` is empty. */
	error?: string;
}

/** Lowercase, no accents, punctuation and extra spaces collapsed: "Título " → "titulo". */
export function normalizeKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function cellText(cell: GridCell): string {
	if (cell === null || cell === undefined) return "";
	if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString();
	return String(cell).trim();
}

// ---------------------------------------------------------------------------
// CSV

/** `;` or `,` (or tab): the one that appears most outside quotes in the first line. */
export function detectDelimiter(text: string): string {
	const candidates = [";", ",", "\t"];
	const counts = new Map(candidates.map((c) => [c, 0]));
	let quoted = false;
	for (const char of text) {
		if (char === '"') quoted = !quoted;
		else if (!quoted && (char === "\n" || char === "\r")) break;
		else if (!quoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
	}
	let best = ",";
	let bestCount = 0;
	for (const [candidate, count] of counts) {
		if (count > bestCount) {
			best = candidate;
			bestCount = count;
		}
	}
	return best;
}

/**
 * Parses CSV text into rows of strings. Handles a UTF-8 BOM, CRLF, quoted fields with
 * delimiters, line breaks and doubled quotes inside, and auto-detects `;` or `,`.
 * Blank lines are dropped.
 */
export function parseCsv(input: string, delimiter?: string): string[][] {
	const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
	const sep = delimiter ?? detectDelimiter(text);
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;

	const endRow = () => {
		row.push(field);
		if (row.some((cell) => cell.trim() !== "")) rows.push(row);
		row = [];
		field = "";
	};

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					quoted = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"' && field.trim() === "") {
			field = "";
			quoted = true;
		} else if (char === sep) {
			row.push(field);
			field = "";
		} else if (char === "\r") {
			if (text[i + 1] === "\n") i++;
			endRow();
		} else if (char === "\n") {
			endRow();
		} else {
			field += char;
		}
	}
	if (field !== "" || row.length > 0) endRow();
	return rows;
}

// ---------------------------------------------------------------------------
// Columns

/** Finds each field's column in the header row (case and accent insensitive). */
export function mapColumns(header: readonly GridCell[]): {
	columns: Partial<Record<GridField, number>>;
	ignored: string[];
} {
	const columns: Partial<Record<GridField, number>> = {};
	const ignored: string[] = [];
	header.forEach((cell, index) => {
		const raw = cellText(cell);
		if (!raw) return;
		const key = normalizeKey(raw);
		const field = GRID_FIELDS.find(
			(f) => columns[f] === undefined && GRID_COLUMN_SYNONYMS[f].includes(key),
		);
		if (field) columns[field] = index;
		else ignored.push(raw);
	});
	return { columns, ignored };
}

// ---------------------------------------------------------------------------
// Values

/** Formato → content format; unknown or empty → post with a warning. */
export function normalizeFormat(raw: string): { format: ContentFormat; warning?: string } {
	const key = normalizeKey(raw);
	if (!key) return { format: DEFAULT_GRID_FORMAT };
	const known = GRID_FORMAT_ALIASES[key] ?? GRID_FORMAT_ALIASES[key.split(" ")[0] ?? ""];
	if (known) return { format: known };
	return {
		format: DEFAULT_GRID_FORMAT,
		warning: `No reconocimos el formato «${raw.trim()}»: la revisamos como post.`,
	};
}

/** Canal → content channel; unknown or empty → Instagram with a warning. */
export function normalizeChannel(raw: string): { channel: ContentChannel; warning?: string } {
	const key = normalizeKey(raw);
	if (!key) {
		return {
			channel: DEFAULT_GRID_CHANNEL,
			warning: "Sin canal: la revisamos como Instagram.",
		};
	}
	const known = GRID_CHANNEL_ALIASES[key];
	if (known) return known.warning ? { ...known } : { channel: known.channel };
	return {
		channel: DEFAULT_GRID_CHANNEL,
		warning: `No reconocimos el canal «${raw.trim()}»: la revisamos como Instagram.`,
	};
}

/** Excel stores dates as days since 1899-12-30 (with the 1900 leap-year bug baked in). */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;
/** Serial numbers we accept as dates: 1954-10-03 … 2119-01-10. */
const EXCEL_SERIAL_RANGE = { min: 20_000, max: 80_000 } as const;

function isoFromParts(year: number, month: number, day: number): string | null {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
	const time = Date.UTC(year, month - 1, day);
	const date = new Date(time);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}
	return date.toISOString().slice(0, 10);
}

/** Excel serial date (e.g. 46316) → "2026-10-21"; null outside the accepted range. */
export function excelSerialToIso(serial: number): string | null {
	if (!Number.isFinite(serial)) return null;
	if (serial < EXCEL_SERIAL_RANGE.min || serial > EXCEL_SERIAL_RANGE.max) return null;
	return new Date(EXCEL_EPOCH_UTC + Math.floor(serial) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A grid date → ISO date (yyyy-mm-dd), or null when it cannot be read. Accepts Date
 * objects (read in UTC, as .xlsx readers build them), Excel serial numbers,
 * dd/mm/yyyy (also with - or . and 2-digit years) and yyyy-mm-dd (with or without time).
 */
export function parseGridDate(cell: GridCell): string | null {
	if (cell === null || cell === undefined || typeof cell === "boolean") return null;
	if (cell instanceof Date) {
		if (Number.isNaN(cell.getTime())) return null;
		return isoFromParts(cell.getUTCFullYear(), cell.getUTCMonth() + 1, cell.getUTCDate());
	}
	if (typeof cell === "number") return excelSerialToIso(cell);

	const text = cell.trim();
	if (!text) return null;
	const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
	if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
	const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(text);
	if (dmy) {
		const rawYear = Number(dmy[3]);
		const year = (dmy[3] ?? "").length === 2 ? 2000 + rawYear : rawYear;
		return isoFromParts(year, Number(dmy[2]), Number(dmy[1]));
	}
	if (/^\d+(?:\.\d+)?$/.test(text)) return excelSerialToIso(Number(text));
	return null;
}

/** First non-empty line of the text, cut to a readable title length. */
export function titleFromBody(body: string, max: number = GRID_LIMITS.derivedTitleLength): string {
	const line =
		body
			.split(/\r?\n/)
			.map((l) => l.trim())
			.find(Boolean) ?? "";
	if (line.length <= max) return line;
	const cut = line.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Rows

function at(row: readonly GridCell[], index: number | undefined): GridCell {
	return index === undefined ? undefined : row[index];
}

/** Normalizes one data row (already split into cells) using the mapped columns. */
export function normalizeGridRow(
	row: readonly GridCell[],
	columns: Partial<Record<GridField, number>>,
	line: number,
): GridRow {
	const warnings: string[] = [];
	const body = cellText(at(row, columns.body));
	const rawTitle = cellText(at(row, columns.title));
	const format = normalizeFormat(cellText(at(row, columns.format)));
	const channel = normalizeChannel(cellText(at(row, columns.channel)));
	const notes = cellText(at(row, columns.notes)).slice(0, GRID_LIMITS.maxNotesLength);
	if (format.warning) warnings.push(format.warning);
	if (channel.warning) warnings.push(channel.warning);

	let title = rawTitle;
	if (!title && body) {
		title = titleFromBody(body);
		warnings.push("Sin título: usamos la primera línea del texto.");
	}
	if (title.length > GRID_LIMITS.maxTitleLength) {
		title = title.slice(0, GRID_LIMITS.maxTitleLength);
		warnings.push(`El título se cortó a ${GRID_LIMITS.maxTitleLength} caracteres.`);
	}

	const dateCell = at(row, columns.date);
	const scheduledFor = parseGridDate(dateCell) ?? undefined;
	const rawDate = cellText(dateCell);
	if (!scheduledFor) {
		warnings.push(
			rawDate
				? `No entendimos la fecha «${rawDate}» (usa dd/mm/aaaa): queda sin programar.`
				: "Sin fecha: queda sin programar.",
		);
	}

	let error: string | undefined;
	if (!body) error = "Falta el texto: esta fila no se revisa.";
	else if (body.length > GRID_LIMITS.maxBodyLength) {
		error = `El texto supera ${GRID_LIMITS.maxBodyLength} caracteres: acórtalo para revisarlo.`;
	}

	return {
		line,
		title: title || "Sin título",
		body,
		format: format.format,
		channel: channel.channel,
		...(scheduledFor ? { scheduledFor } : {}),
		...(notes ? { notes } : {}),
		warnings,
		...(error ? { error } : {}),
	};
}

/**
 * Reads a whole grid: the first non-empty row is the header, every other non-empty row
 * is a piece. Works the same for CSV rows and .xlsx rows.
 */
export function parseGridRows(table: readonly (readonly GridCell[])[]): GridParseResult {
	const isBlank = (row: readonly GridCell[]) => row.every((cell) => cellText(cell) === "");
	const headerIndex = table.findIndex((row) => !isBlank(row));
	if (headerIndex === -1) {
		return { rows: [], columns: {}, ignoredColumns: [], error: "El archivo está vacío." };
	}
	const { columns, ignored } = mapColumns(table[headerIndex] ?? []);
	if (columns.body === undefined) {
		return {
			rows: [],
			columns,
			ignoredColumns: ignored,
			error:
				"No encontramos la columna «texto». La primera fila debe tener los nombres de las columnas: fecha, titulo, texto, formato, canal, notas.",
		};
	}

	const data: { cells: readonly GridCell[]; line: number }[] = [];
	table.forEach((cells, index) => {
		if (index > headerIndex && !isBlank(cells)) data.push({ cells, line: index + 1 });
	});
	if (data.length === 0) {
		return {
			rows: [],
			columns,
			ignoredColumns: ignored,
			error: "La grilla no tiene filas debajo de los nombres de las columnas.",
		};
	}
	if (data.length > GRID_LIMITS.maxRows) {
		return {
			rows: [],
			columns,
			ignoredColumns: ignored,
			error: `La grilla tiene ${data.length} filas y el máximo es ${GRID_LIMITS.maxRows}. Divídela en dos archivos.`,
		};
	}

	return {
		rows: data.map(({ cells, line }) => normalizeGridRow(cells, columns, line)),
		columns,
		ignoredColumns: ignored,
	};
}

/** Parses CSV text straight into grid rows. */
export function parseCsvGrid(text: string): GridParseResult {
	return parseGridRows(parseCsv(text));
}

// ---------------------------------------------------------------------------
// Template

/** Example rows of the downloadable template (simulated content). */
export const GRID_TEMPLATE_ROWS: readonly (readonly string[])[] = [
	[
		"21/10/2026",
		"3 errores al levantar tu primera ronda",
		"Levantar capital no empieza con el pitch: empieza con tus métricas. Te contamos los 3 errores que más vemos y cómo evitarlos.",
		"carrusel",
		"instagram",
		"Diseño: usar paleta de la marca",
	],
	[
		"22/10/2026",
		"",
		"¿Tu startup está lista para escalar? Hoy a las 7 p. m. lo conversamos en vivo con fundadores de la comunidad.",
		"reel",
		"instagram",
		"",
	],
	[
		"23/10/2026",
		"Qué buscan los inversionistas en 2026",
		"Hablamos con fondos de la región sobre lo que miran antes de invertir. Resumen en el artículo.",
		"post",
		"linkedin",
		"Enlazar al blog",
	],
	[
		"24/10/2026",
		"Boletín semanal",
		"Esta semana: cómo armar tu data room, una plantilla gratuita y los próximos eventos de la comunidad.",
		"newsletter",
		"newsletter",
		"",
	],
];

function csvField(value: string): string {
	return /[",;\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The template as CSV text (comma separated, CRLF), without BOM. */
export function gridTemplateCsv(): string {
	const header = GRID_FIELDS.map((field) => GRID_FIELD_LABEL[field]);
	return [header, ...GRID_TEMPLATE_ROWS].map((row) => row.map(csvField).join(",")).join("\r\n");
}
