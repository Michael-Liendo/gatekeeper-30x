/**
 * Campaign calendar: groups scheduled pieces by week (Monday first) and day. Pure, so
 * the agenda logic is testable without a browser. Dates are ISO dates (yyyy-mm-dd).
 */

export interface CalendarDay<T> {
	/** yyyy-mm-dd */
	date: string;
	items: T[];
}

export interface CalendarWeek<T> {
	/** Monday of the week, yyyy-mm-dd. */
	start: string;
	/** Sunday of the week, yyyy-mm-dd. */
	end: string;
	/** The seven days Monday → Sunday, empty ones included. */
	days: CalendarDay<T>[];
	total: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(iso: string): number {
	return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

function toIso(time: number): string {
	return new Date(time).toISOString().slice(0, 10);
}

/** Monday of the week that contains `iso`. */
export function weekStart(iso: string): string {
	const time = toTime(iso);
	const weekday = (new Date(time).getUTCDay() + 6) % 7; // Monday = 0
	return toIso(time - weekday * DAY_MS);
}

/** Adds `days` to an ISO date. */
export function addDays(iso: string, days: number): string {
	return toIso(toTime(iso) + days * DAY_MS);
}

/**
 * Groups items with a valid date into weeks (oldest first). Each week lists all seven
 * days; items keep their input order inside a day.
 */
export function groupByWeek<T>(
	items: readonly T[],
	dateOf: (item: T) => string | undefined,
): CalendarWeek<T>[] {
	const weeks = new Map<string, CalendarWeek<T>>();
	for (const item of items) {
		const date = dateOf(item);
		if (!date || Number.isNaN(toTime(date))) continue;
		const day = date.slice(0, 10);
		const start = weekStart(day);
		let week = weeks.get(start);
		if (!week) {
			week = {
				start,
				end: addDays(start, 6),
				days: Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), items: [] })),
				total: 0,
			};
			weeks.set(start, week);
		}
		const offset = Math.round((toTime(day) - toTime(start)) / DAY_MS);
		week.days[offset]?.items.push(item);
		week.total += 1;
	}
	return [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start));
}
