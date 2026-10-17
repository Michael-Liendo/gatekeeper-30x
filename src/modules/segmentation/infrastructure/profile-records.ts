import {
	type DatasetProfile,
	INFO_LEVELS,
	type InfoLevel,
	programKeyFromLabel,
} from "../domain/profile";

/** Column names in 30X's sheet (`data/perfiles-30x.csv`). */
export const COLUMNS = {
	id: "ID",
	relacion: "Relación con 30X",
	estado: "Estado",
	etapaCrm: "Etapa en el CRM",
	programa: "Programa",
	rol: "Rol",
	pais: "País",
	dolor: "Dolor principal",
	objetivo: "Objetivo principal",
	programaSugerido: "Programa sugerido",
	afinidad: "Afinidad (0-10)",
	bandaAfinidad: "Banda de afinidad",
	temas: "Temas de interés",
	nivelInfo: "Nivel de info",
} as const;

function parseTopics(raw: string): string[] {
	return raw
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0 && tag !== "—");
}

function parseInfoLevel(raw: string): InfoLevel {
	const level = raw.trim() as InfoLevel;
	return INFO_LEVELS.includes(level) ? level : "Baja";
}

/** One CSV record → profile (sign-up fields) + labels (ground truth), kept apart. */
export function toDatasetProfile(record: Record<string, string>): DatasetProfile | null {
	const id = record[COLUMNS.id]?.trim();
	const programaSugerido = programKeyFromLabel(record[COLUMNS.programaSugerido] ?? "");
	if (!id || !programaSugerido) return null;
	return {
		id,
		profile: {
			rol: record[COLUMNS.rol] ?? "",
			pais: record[COLUMNS.pais] ?? "",
			dolor: record[COLUMNS.dolor] ?? "",
			objetivo: record[COLUMNS.objetivo] ?? "",
			temas: parseTopics(record[COLUMNS.temas] ?? ""),
			relacion: record[COLUMNS.relacion] ?? "",
			nivelInfo: parseInfoLevel(record[COLUMNS.nivelInfo] ?? ""),
		},
		labels: {
			programaSugerido,
			afinidad: Number(record[COLUMNS.afinidad] ?? "0") || 0,
			bandaAfinidad: record[COLUMNS.bandaAfinidad] ?? "",
			estado: record[COLUMNS.estado] ?? "",
			etapaCrm: record[COLUMNS.etapaCrm] ?? "",
			programa: record[COLUMNS.programa] ?? "",
		},
	};
}
