/** Number formatting for the panel. Fixed locale so server and client render the same. */

const LOCALE = "es-ES";

const percent0 = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 });
const percent1 = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1 });
const decimal2 = new Intl.NumberFormat(LOCALE, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0, useGrouping: true });
const oneDecimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const usdSmall = new Intl.NumberFormat(LOCALE, { maximumSignificantDigits: 3 });
const usdRegular = new Intl.NumberFormat(LOCALE, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 4,
});

const EMPTY = "—";

export function formatPercent(value: number | null | undefined, precise = false): string {
	if (value == null || !Number.isFinite(value)) return EMPTY;
	return (precise ? percent1 : percent0).format(value);
}

export function formatDecimal(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return EMPTY;
	return decimal2.format(value);
}

export function formatInteger(value: number): string {
	return integer.format(value);
}

export function formatMs(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return EMPTY;
	return `${(value < 10 ? oneDecimal : integer).format(value)} ms`;
}

export function formatSeconds(ms: number): string {
	return `${decimal2.format(ms / 1000)} s`;
}

/** Keeps every meaningful digit of tiny amounts: 0.0000123 → "0,0000123 USD". */
export function formatUsd(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return EMPTY;
	if (value === 0) return "0 USD";
	return `${(value < 0.01 ? usdSmall : usdRegular).format(value)} USD`;
}
