import type { Route } from "../../content-review/domain/editorial-policy";
import type { ReviewResult } from "../../content-review/domain/review";
import { PIECE_STATUS_LABEL, type PieceStatus } from "./workspace";

/** Name shown as the actor of review events. */
export const REVIEWER_NAME = "JEV";

/** Spanish name of each JEV route, as the panel shows it. */
const ROUTE_NAME: Record<Route, string> = {
	AUTO_APPROVE: "Aprobado",
	ENRICH_WITH_LLM: "Mejorar con IA",
	HUMAN_REVIEW: "Revisar",
	REJECT: "Descartado",
};

/** Max reasons listed in a review summary. */
const MAX_REASONS = 3;

/** "Datos sin fuente (0,72)" → "Datos sin fuente". */
function reasonLabel(message: string): string {
	return message.replace(/\s*\([\d,.]+\)$/, "");
}

/** "JEV: Mejorar con IA · Datos sin fuente, Demasiado promocional". */
export function reviewSummary(review: Pick<ReviewResult, "route" | "reasons">): string {
	const head = `${REVIEWER_NAME}: ${ROUTE_NAME[review.route]}`;
	const reasons = [...new Set(review.reasons.map((r) => reasonLabel(r.message)))].slice(
		0,
		MAX_REASONS,
	);
	return reasons.length > 0 ? `${head} · ${reasons.join(", ")}` : head;
}

/** "Movida a Aprobado" or "Movida a Aprobado · <nota>". */
export function statusChangeSummary(status: PieceStatus, note?: string): string {
	const head = `Movida a ${PIECE_STATUS_LABEL[status]}`;
	return note ? `${head} · ${note}` : head;
}

/** "Versión 2 guardada" or "Versión 2 guardada · cambio 1; cambio 2". */
export function versionSummary(version: number, changes: readonly string[] = []): string {
	const head = `Versión ${version} guardada`;
	return changes.length > 0 ? `${head} · ${changes.join("; ")}` : head;
}

export const SUBMITTED_SUMMARY = "Subió la pieza";
