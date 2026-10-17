/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes (""), commas and line
 * breaks inside quotes, CRLF or LF. No I/O, no dependencies.
 */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;
	const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (inQuotes) {
			if (char === '"') {
				if (source[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}
		if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && source[i + 1] === "\n") i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += char;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

/** Rows as objects keyed by the header row. Blank lines are skipped. */
export function parseCsvRecords(text: string): Record<string, string>[] {
	const [header, ...rows] = parseCsv(text);
	if (!header) return [];
	return rows
		.filter((row) => row.some((cell) => cell.trim().length > 0))
		.map((row) => Object.fromEntries(header.map((name, index) => [name.trim(), row[index] ?? ""])));
}
