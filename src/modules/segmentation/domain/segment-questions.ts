import type { DecisionQuestions } from "../../content-review/domain/decision";
import type { ProgramKey } from "./profile";

/**
 * Plain descriptions of each 30X program, written from the profiles 30X tagged with
 * them in `data/perfiles-30x.csv` (who they are, what they ask for). Data, not code:
 * 30X can refine the wording without touching the policy.
 */
export const PROGRAM_DESCRIPTIONS: Record<ProgramKey, string> = {
	ai_sales:
		"AI Sales: ventas con IA para equipos comerciales. Para quien quiere vender más usando IA en prospección, seguimiento y automatización comercial. Suele marcar a la vez ventas e IA entre sus temas.",
	inmersion_ejecutiva:
		"Inmersión Ejecutiva: 3 días presenciales de estrategia y liderazgo para fundadores y directivos. Suele marcar liderazgo entre sus temas, o busca finanzas, contratar equipo, levantar capital, expandirse a otros países, delegar o una red de pares.",
	sales_machine:
		"Sales Machine: sistema de ventas B2B. Para quien no tiene un proceso comercial estructurado o quiere construir una máquina de ventas predecible. Suele marcar ventas (con operaciones o salida al mercado) pero no IA.",
	hardcore_ai:
		"Hardcore AI: implementación técnica de IA. Para perfiles técnicos (ingeniería, datos, producto) o quien quiere construir por su cuenta automatizaciones con IA. Su interés es casi solo IA o producto, sin ventas.",
	achievers:
		"Achievers: programa para emprendedores en etapa temprana que necesitan ordenar y hacer crecer su negocio en varios frentes a la vez (ventas, marketing, operaciones, liderazgo) o transformar su modelo de negocio.",
	none: "Sin programa claro: el perfil casi no tiene datos (sin cargo, sin dolor, pocos temas) o su interés es demasiado general, por ejemplo solo IA o solo formarse, para recomendar un programa con seguridad.",
};

/**
 * Typed questions the decision engine answers about each sign-up in one pass. Spanish,
 * one observable judgment each; thresholds and routing live in `segment-policy.ts`.
 * Keys are fixed: the policy depends on them.
 */
export const segmentQuestions = {
	program: {
		type: "choice",
		instructions: "Según su perfil, ¿qué programa de 30X le sirve más a esta persona ahora mismo?",
		options: { ...PROGRAM_DESCRIPTIONS },
	},
	seniority: {
		type: "score",
		instructions: "¿Qué tan alto es su cargo y su poder de decisión en la empresa?",
		levels: [
			{
				label: "Ejecutor",
				description: "Perfil técnico o colaborador que ejecuta, o no hay dato de su cargo.",
			},
			{
				label: "Gerente",
				description: "Gerente, jefe de área o líder de un equipo (por ejemplo, el comercial).",
			},
			{
				label: "Dueño o C-level",
				description: "Fundador, socio, CEO, director, VP o C-level: decide en la empresa.",
			},
		],
	},
	ai_maturity: {
		type: "score",
		instructions: "¿Qué tan avanzada está esta persona o su empresa en el uso de la IA?",
		levels: [
			{ label: "Baja", description: "No menciona la IA o quiere empezar a aprender sobre ella." },
			{ label: "Media", description: "Quiere aplicar la IA o automatizar procesos con ella." },
			{
				label: "Alta",
				description: "Ya implementa IA o tiene un perfil técnico para construirla.",
			},
		],
	},
	sales_ready: {
		type: "yes_no",
		instructions:
			"¿Está lista para una conversación comercial con un asesor de 30X? Responde sí si muestra una necesidad concreta de negocio y un interés claro en lo que 30X enseña.",
	},
	has_context: {
		type: "yes_no",
		instructions:
			"¿El perfil da suficiente contexto (cargo, dolor, objetivo o temas concretos) para entender qué necesita esta persona?",
	},
} satisfies DecisionQuestions;
