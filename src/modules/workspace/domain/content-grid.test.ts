import assert from "node:assert/strict";
import { describe, it } from "node:test";

const grid = (await import(
	new URL("./content-grid.ts", import.meta.url).href
)) as typeof import("./content-grid");
const calendar = (await import(
	new URL("./campaign-calendar.ts", import.meta.url).href
)) as typeof import("./campaign-calendar");

describe("parseCsv", () => {
	it("handles BOM, CRLF, quoted fields, doubled quotes and line breaks", () => {
		const text =
			'﻿fecha,titulo,texto\r\n21/10/2026,"Hola, mundo","Línea 1\nLínea ""2"""\r\n\r\n22/10/2026,Otro,Texto\r\n';
		assert.deepEqual(grid.parseCsv(text), [
			["fecha", "titulo", "texto"],
			["21/10/2026", "Hola, mundo", 'Línea 1\nLínea "2"'],
			["22/10/2026", "Otro", "Texto"],
		]);
	});

	it("auto-detects semicolons (Excel in Spanish) and keeps commas inside fields", () => {
		const text = "fecha;texto;canal\n2026-10-21;Uno, dos y tres;IG";
		assert.equal(grid.detectDelimiter(text), ";");
		assert.deepEqual(grid.parseCsv(text)[1], ["2026-10-21", "Uno, dos y tres", "IG"]);
	});

	it("ignores delimiters inside quotes when detecting", () => {
		assert.equal(grid.detectDelimiter('"a;b;c",d,e\n1,2,3'), ",");
	});

	it("keeps empty trailing cells and a last line without newline", () => {
		assert.deepEqual(grid.parseCsv("a,b,c\n1,,"), [
			["a", "b", "c"],
			["1", "", ""],
		]);
	});
});

describe("mapColumns", () => {
	it("is case and accent insensitive and accepts synonyms", () => {
		const { columns, ignored } = grid.mapColumns([
			"Día",
			"TEMA",
			"Caption",
			"Tipo",
			"Red Social",
			"Comentarios",
			"Responsable",
		]);
		assert.deepEqual(columns, { date: 0, title: 1, body: 2, format: 3, channel: 4, notes: 5 });
		assert.deepEqual(ignored, ["Responsable"]);
	});

	it("maps Fecha de publicación, Título, Descripción, Plataforma", () => {
		const { columns } = grid.mapColumns([
			"Fecha de publicación",
			"Título",
			"Descripción",
			"Plataforma",
		]);
		assert.deepEqual(columns, { date: 0, title: 1, body: 2, channel: 3 });
	});
});

describe("normalization", () => {
	it("formats: reel/video/historia → clip, carrusel → post, guion → video_script, boletín → newsletter", () => {
		const cases: [string, string][] = [
			["Reel", "clip"],
			["video", "clip"],
			["Historia", "clip"],
			["Carrusel", "post"],
			["post", "post"],
			["Guión", "video_script"],
			["Boletín", "newsletter"],
			["email", "newsletter"],
			["", "post"],
		];
		for (const [raw, expected] of cases) {
			assert.equal(grid.normalizeFormat(raw).format, expected, raw);
		}
		const unknown = grid.normalizeFormat("podcast");
		assert.equal(unknown.format, "post");
		assert.match(unknown.warning ?? "", /podcast/);
	});

	it("channels: twitter → x, ig → instagram, tiktok → instagram with a warning", () => {
		assert.deepEqual(grid.normalizeChannel("Twitter"), { channel: "x" });
		assert.deepEqual(grid.normalizeChannel("IG"), { channel: "instagram" });
		assert.deepEqual(grid.normalizeChannel("LinkedIn"), { channel: "linkedin" });
		assert.deepEqual(grid.normalizeChannel("YouTube"), { channel: "youtube" });
		assert.deepEqual(grid.normalizeChannel("Boletín"), { channel: "newsletter" });
		const tiktok = grid.normalizeChannel("TikTok");
		assert.equal(tiktok.channel, "instagram");
		assert.match(tiktok.warning ?? "", /TikTok/);
		const unknown = grid.normalizeChannel("Pinterest");
		assert.equal(unknown.channel, "instagram");
		assert.match(unknown.warning ?? "", /Pinterest/);
	});

	it("dates: dd/mm/yyyy, yyyy-mm-dd, Excel serials and Date objects → ISO date", () => {
		assert.equal(grid.parseGridDate("21/10/2026"), "2026-10-21");
		assert.equal(grid.parseGridDate("1/2/2026"), "2026-02-01");
		assert.equal(grid.parseGridDate("21-10-26"), "2026-10-21");
		assert.equal(grid.parseGridDate("2026-10-21"), "2026-10-21");
		assert.equal(grid.parseGridDate("2026-10-21T15:00:00Z"), "2026-10-21");
		assert.equal(grid.parseGridDate(46316), "2026-10-21");
		assert.equal(grid.parseGridDate("46316"), "2026-10-21");
		assert.equal(grid.parseGridDate(45658), "2025-01-01");
		assert.equal(grid.parseGridDate(new Date(Date.UTC(2026, 9, 21))), "2026-10-21");
	});

	it("dates: invalid or out-of-range values → null", () => {
		assert.equal(grid.parseGridDate("31/02/2026"), null);
		assert.equal(grid.parseGridDate("mañana"), null);
		assert.equal(grid.parseGridDate(""), null);
		assert.equal(grid.parseGridDate(12), null);
		assert.equal(grid.parseGridDate(null), null);
		assert.equal(grid.parseGridDate(new Date(Number.NaN)), null);
	});

	it("title from the first line of the text, cut at a word", () => {
		assert.equal(grid.titleFromBody("\n  Hola equipo  \nSegunda línea"), "Hola equipo");
		const long = grid.titleFromBody(`${"palabra ".repeat(30)}`, 40);
		assert.ok(long.length <= 40);
		assert.ok(long.endsWith("…"));
	});
});

describe("parseGridRows", () => {
	const csv = [
		"Fecha;Título;Texto;Formato;Canal;Notas",
		"21/10/2026;Lanzamiento;Hoy lanzamos el programa.;Reel;IG;Con música",
		';;"Sin título ni fecha.\nSegunda línea";carrusel;LinkedIn;',
		"23/10/2026;Sin texto;;post;x;",
		"mañana;Fecha rara;Texto válido;podcast;tiktok;",
	].join("\n");

	it("normalizes every row with inline warnings and errors", () => {
		const result = grid.parseCsvGrid(csv);
		assert.equal(result.error, undefined);
		assert.equal(result.rows.length, 4);
		const [first, second, third, fourth] = result.rows;

		assert.deepEqual(first, {
			line: 2,
			title: "Lanzamiento",
			body: "Hoy lanzamos el programa.",
			format: "clip",
			channel: "instagram",
			scheduledFor: "2026-10-21",
			notes: "Con música",
			warnings: [],
		});

		assert.equal(second?.title, "Sin título ni fecha.");
		assert.equal(second?.format, "post");
		assert.equal(second?.channel, "linkedin");
		assert.equal(second?.scheduledFor, undefined);
		assert.ok(second?.warnings.some((w) => w.includes("primera línea")));
		assert.ok(second?.warnings.some((w) => w.includes("Sin fecha")));

		assert.match(third?.error ?? "", /Falta el texto/);

		assert.equal(fourth?.error, undefined);
		assert.equal(fourth?.channel, "instagram");
		assert.equal(fourth?.warnings.length, 3); // formato, TikTok, fecha
	});

	it("works with .xlsx-like rows (numbers and Dates) and skips blank rows", () => {
		const result = grid.parseGridRows([
			[null, null],
			["Date", "Copy", "Channel"],
			[46316, "Uno", "twitter"],
			[null, "", undefined],
			[new Date(Date.UTC(2026, 9, 22)), "Dos", "blog"],
		]);
		assert.equal(result.rows.length, 2);
		assert.equal(result.rows[0]?.scheduledFor, "2026-10-21");
		assert.equal(result.rows[0]?.channel, "x");
		assert.equal(result.rows[0]?.line, 3);
		assert.equal(result.rows[1]?.scheduledFor, "2026-10-22");
		assert.equal(result.rows[1]?.line, 5);
	});

	it("rejects files without a texto column, without rows or with too many rows", () => {
		assert.match(grid.parseCsvGrid("fecha,titulo\n1/1/2026,Hola").error ?? "", /texto/);
		assert.match(grid.parseCsvGrid("texto\n").error ?? "", /no tiene filas/);
		assert.match(grid.parseCsvGrid("").error ?? "", /vacío/);
		const many = ["texto", ...Array.from({ length: 201 }, (_, i) => `Pieza ${i}`)].join("\n");
		assert.match(grid.parseCsvGrid(many).error ?? "", /máximo es 200/);
	});

	it("marks texts over the limit as errors", () => {
		const result = grid.parseCsvGrid(`texto\n${"a".repeat(4001)}`);
		assert.match(result.rows[0]?.error ?? "", /4000/);
	});

	it("the downloadable template parses cleanly", () => {
		const result = grid.parseCsvGrid(grid.gridTemplateCsv());
		assert.equal(result.error, undefined);
		assert.equal(result.rows.length, grid.GRID_TEMPLATE_ROWS.length);
		assert.ok(result.rows.every((row) => !row.error && row.scheduledFor));
	});
});

describe("groupByWeek", () => {
	it("groups by Monday-first week and day, oldest first, skipping undated items", () => {
		const items = [
			{ id: "c", date: "2026-10-26" }, // Monday of the next week
			{ id: "a", date: "2026-10-21" }, // Wednesday
			{ id: "x", date: undefined },
			{ id: "b", date: "2026-10-25" }, // Sunday
			{ id: "a2", date: "2026-10-21" },
		];
		const weeks = calendar.groupByWeek(items, (item) => item.date);
		assert.equal(weeks.length, 2);
		assert.equal(weeks[0]?.start, "2026-10-19");
		assert.equal(weeks[0]?.end, "2026-10-25");
		assert.equal(weeks[0]?.total, 3);
		assert.equal(weeks[0]?.days.length, 7);
		assert.deepEqual(
			weeks[0]?.days[2]?.items.map((i) => i.id),
			["a", "a2"],
		);
		assert.deepEqual(
			weeks[0]?.days[6]?.items.map((i) => i.id),
			["b"],
		);
		assert.equal(weeks[1]?.start, "2026-10-26");
		assert.equal(weeks[1]?.days[0]?.items[0]?.id, "c");
	});
});
