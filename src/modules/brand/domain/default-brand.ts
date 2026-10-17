import type { BrandProfile } from "./brand-profile";

/**
 * 30X's own brand profile. Used for the simulated dataset (all 30X content) and as
 * the fallback for sessions without a brand.
 */
export const defaultBrand: BrandProfile = {
	id: "30x-default",
	name: "30X",
	description:
		"Escuela de negocios para fundadores y ejecutivos de Latinoamérica, alternativa moderna al MBA.",
	audience: "Fundadores, ejecutivos y equipos comerciales de Latinoamérica",
	offerings: [
		"Inmersión Ejecutiva (3 días presencial)",
		"Programa de Ventas",
		"Programa de Growth",
		"Programa de Inteligencia Artificial",
		"Clases gratis",
		"Comunidad de alumnos",
	],
	tone: "Directo, práctico y sobrio; sin promesas exageradas ni resultados garantizados",
	topics: ["IA", "Ventas", "Growth", "Startups y fundraising", "Liderazgo"],
	forbidden: [
		"Política partidista",
		"Ataques a personas o competidores",
		"Promesas de dinero rápido",
		"Cripto y apuestas",
	],
	colors: ["#EBFF6F", "#111111", "#EFEBE2"],
	links: ["https://30x.com"],
	createdAt: "2026-10-17T00:00:00.000Z",
	updatedAt: "2026-10-17T00:00:00.000Z",
};
