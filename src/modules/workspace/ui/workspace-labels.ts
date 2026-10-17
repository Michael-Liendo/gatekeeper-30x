import { friendlyReasons } from "@/modules/content-review/ui/labels";
import type { PieceEventType, PieceStatus, TeamRole, WorkspacePiece } from "../domain/workspace";

/** Spanish labels and soft styling for the team workspace. */

export const STATUSES: readonly PieceStatus[] = [
	"in_review",
	"needs_changes",
	"approved",
	"rejected",
];

export const STATUS_LABEL: Record<PieceStatus, string> = {
	in_review: "Por revisar",
	needs_changes: "Por mejorar",
	approved: "Aprobado",
	rejected: "Rechazado",
};

export const STATUS_HINT: Record<PieceStatus, string> = {
	in_review: "Alguien del equipo debe mirarla antes de publicar",
	needs_changes: "Casi lista: hay cosas por corregir",
	approved: "Lista para publicar",
	rejected: "No se publica",
};

/** Literal classes so Tailwind sees them; colors follow the route tokens. */
export const STATUS_STYLE: Record<
	PieceStatus,
	{ dot: string; soft: string; ink: string; gradient: string }
> = {
	in_review: {
		dot: "bg-human",
		soft: "bg-human-soft",
		ink: "text-human-ink",
		gradient: "from-peach-from to-peach-to",
	},
	needs_changes: {
		dot: "bg-enrich",
		soft: "bg-enrich-soft",
		ink: "text-enrich-ink",
		gradient: "from-lilac-from to-lilac-to",
	},
	approved: {
		dot: "bg-approve",
		soft: "bg-approve-soft",
		ink: "text-approve-ink",
		gradient: "from-aqua-from to-aqua-to",
	},
	rejected: {
		dot: "bg-reject",
		soft: "bg-reject-soft",
		ink: "text-reject-ink",
		gradient: "from-surface-muted to-line-strong",
	},
};

export const ROLES: readonly TeamRole[] = ["design", "copy", "editor", "other"];

export const ROLE_LABEL: Record<TeamRole, string> = {
	design: "Diseño",
	copy: "Copy",
	editor: "Editor",
	other: "Otro",
};

export const EVENT_LABEL: Record<PieceEventType, string> = {
	submitted: "Subida",
	reviewed: "Revisión de JEV",
	status_changed: "Cambio de estado",
	ai_suggested: "Sugerencia de la IA",
	version_saved: "Nueva versión",
	note: "Nota",
};

export function isTeamRole(value: unknown): value is TeamRole {
	return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Main reason JEV gave, only where the person has something to fix. */
export function topReason(piece: WorkspacePiece): string | null {
	if (piece.status !== "needs_changes" && piece.status !== "rejected") return null;
	return friendlyReasons(piece.review, 1)[0] ?? null;
}

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 5 minutos", "ayer". */
export function timeAgo(iso: string, now: number = Date.now()): string {
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return "";
	const seconds = Math.round((time - now) / 1000);
	for (const [unit, size] of UNITS) {
		if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
	}
	return "hace un momento";
}

/** "17 oct, 10:42" for the timeline. */
export function formatDateTime(iso: string): string {
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return "";
	return new Intl.DateTimeFormat("es", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	}).format(time);
}
