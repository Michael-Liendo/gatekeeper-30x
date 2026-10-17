import { TOPIC_LABEL } from "../domain/profile";

/** Form options, taken from the values in 30X's profile sheet. */

export const ROLE_OPTIONS = [
	"Fundador, socio o CEO",
	"Director, VP o C-level (no dueño)",
	"Gerente o jefe de área",
	"Líder comercial o de ventas",
	"Perfil técnico (ingeniería, datos, producto)",
	"Sin dato de rol",
] as const;

export const COUNTRY_OPTIONS = [
	"Colombia",
	"México",
	"Argentina",
	"Chile",
	"Perú",
	"Venezuela",
	"España",
	"Estados Unidos",
	"Sin dato",
] as const;

export const PAIN_OPTIONS = [
	"No declaró ningún dolor",
	"Procesos manuales y rezago tecnológico",
	"Falta de claridad estratégica para escalar",
	"No tiene proceso comercial estructurado",
	"Vive de referidos y prospecta a mano",
	"El dueño es el cuello de botella y no delega",
	"Ventas estancadas o cayendo",
	"Capital y flujo de caja para crecer",
	"Equipo: contratar, retener y vencer la resistencia al cambio",
	"Expansión internacional sin método",
] as const;

export const GOAL_OPTIONS = [
	"Automatizar con IA",
	"Vender más",
	"Formarse (sobre todo en IA)",
	"Expandirse a otros países",
	"Construir una máquina de ventas",
	"Levantar capital",
	"Entrar a una red de pares",
	"Desarrollar liderazgo y equipo",
	"Delegar y pasar a un rol estratégico",
	"Transformar el modelo de negocio",
] as const;

/** Value as stored in 30X's sheet → friendlier label. */
export const RELATION_OPTIONS = [
	{ value: "Lead (sin deal)", label: "Recién inscrito, sin conversación comercial" },
	{ value: "Deal en el CRM", label: "Ya conversa con el equipo comercial" },
] as const;

export const TOPIC_OPTIONS = Object.entries(TOPIC_LABEL).map(([value, label]) => ({
	value,
	label,
}));

export interface LeadForm {
	rol: string;
	pais: string;
	dolor: string;
	objetivo: string;
	temas: string[];
	relacion: string;
}

export const EMPTY_LEAD: LeadForm = {
	rol: "Fundador, socio o CEO",
	pais: "Colombia",
	dolor: "No tiene proceso comercial estructurado",
	objetivo: "Vender más",
	temas: ["sales", "ops"],
	relacion: "Lead (sin deal)",
};

/** Fields a person can change in the "Cambió su situación" demo. */
export const CHANGEABLE_FIELDS = [
	{ key: "rol", label: "Rol", options: ROLE_OPTIONS },
	{ key: "objetivo", label: "Objetivo principal", options: GOAL_OPTIONS },
	{ key: "dolor", label: "Dolor principal", options: PAIN_OPTIONS },
] as const;

export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number]["key"];
