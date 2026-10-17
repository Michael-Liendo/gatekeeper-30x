import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { parseCsv, parseCsvRecords } = (await import(
	new URL("./csv.ts", import.meta.url).href
)) as typeof import("./csv");

describe("parseCsv", () => {
	it("splits plain fields and rows (LF and CRLF)", () => {
		assert.deepEqual(parseCsv("a,b,c\n1,2,3\r\n4,5,6"), [
			["a", "b", "c"],
			["1", "2", "3"],
			["4", "5", "6"],
		]);
	});

	it("keeps commas, escaped quotes and line breaks inside quoted fields", () => {
		const rows = parseCsv(
			'id,rol\nP-1,"Fundador, socio o CEO"\nP-2,"Dice ""hola"""\nP-3,"dos\nlíneas"\n',
		);
		assert.deepEqual(rows, [
			["id", "rol"],
			["P-1", "Fundador, socio o CEO"],
			["P-2", 'Dice "hola"'],
			["P-3", "dos\nlíneas"],
		]);
	});

	it("keeps empty fields and strips a BOM", () => {
		assert.deepEqual(parseCsv("﻿a,,c\n,,"), [
			["a", "", "c"],
			["", "", ""],
		]);
	});
});

describe("parseCsvRecords", () => {
	it("maps rows to the header and skips blank lines", () => {
		const records = parseCsvRecords('ID,Temas\nP-1,"sales, ai"\n\nP-2,—\n');
		assert.deepEqual(records, [
			{ ID: "P-1", Temas: "sales, ai" },
			{ ID: "P-2", Temas: "—" },
		]);
	});
});
