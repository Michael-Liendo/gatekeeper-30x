import type { DecisionAnswer } from "../../content-review/domain/decision";
import { PROGRAM_KEYS, PROGRAM_LABEL, type ProgramKey } from "./profile";

/** What 30X should do next with the person. */
export type NextAction = "ADVISOR" | "PROPOSAL" | "NURTURE" | "HUMAN_REVIEW";

export type SeniorityLevel = "Ejecutor" | "Gerente" | "Dueño o C-level";
export type MaturityLevel = "Baja" | "Media" | "Alta";

const SENIORITY_LEVELS: readonly SeniorityLevel[] = ["Ejecutor", "Gerente", "Dueño o C-level"];
const MATURITY_LEVELS: readonly MaturityLevel[] = ["Baja", "Media", "Alta"];

/** A rule that fired, in plain Spanish for the UI. */
export interface SegmentReason {
	check: string;
	message: string;
}

export interface SegmentDecision {
	/** Assigned program; "none" when the engine wasn't sure enough. */
	program: ProgramKey;
	/** The engine's top choice before the confidence gate (for measuring). */
	engineChoice: ProgramKey | null;
	programConfidence: number;
	seniority: SeniorityLevel | null;
	maturity: MaturityLevel | null;
	/** P(sales_ready) and P(has_context), 0 when missing. */
	salesReady: number;
	hasContext: number;
	action: NextAction;
	/** "Dueño · IA media · AI Sales". */
	label: string;
	reasons: SegmentReason[];
}

/**
 * Tunable thresholds. Data, not code: 30X's commercial team can move them without
 * touching the questions.
 */
export interface SegmentPolicy {
	/** Program confidence at or above this (and not "none") → program assigned. */
	programConfidence: number;
	/** Below this program confidence a person decides. */
	reviewFloor: number;
	/** P(sales_ready) at or above this counts as ready. */
	salesReady: number;
	/** Seniority (0 Ejecutor … 2 Dueño o C-level) at or above this is "high" for the advisor. */
	seniorityHigh: number;
	/** P(has_context) below this → nurture with free content first. */
	contextFloor: number;
}

/** Initial values; see docs/12-segmentacion.md for how they were measured. */
export const defaultSegmentPolicy: SegmentPolicy = {
	programConfidence: 0.3,
	reviewFloor: 0.15,
	salesReady: 0.5,
	seniorityHigh: 1.5,
	contextFloor: 0.5,
};

export const ACTION_LABEL: Record<NextAction, string> = {
	ADVISOR: "Pasar a un asesor comercial",
	PROPOSAL: "Enviar la propuesta del programa",
	NURTURE: "Nutrir con clases gratis y contenido",
	HUMAN_REVIEW: "Revisión humana",
};

const SENIORITY_SHORT: Record<SeniorityLevel, string> = {
	Ejecutor: "Ejecutor",
	Gerente: "Gerente",
	"Dueño o C-level": "Dueño",
};

function isUnitInterval(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isProgramKey(value: string): value is ProgramKey {
	return (PROGRAM_KEYS as string[]).includes(value);
}

/** Rounds a probability-weighted score to the nearest level index. */
function levelOf<T>(answer: DecisionAnswer | undefined, levels: readonly T[]): T | null {
	if (answer?.type !== "score" || !Number.isFinite(answer.score)) return null;
	const index = Math.min(levels.length - 1, Math.max(0, Math.round(answer.score)));
	return levels[index] ?? null;
}

function probability(answer: DecisionAnswer | undefined): number | null {
	return answer?.type === "yes_no" && isUnitInterval(answer.probability)
		? answer.probability
		: null;
}

/** Plain-language certainty for the UI ("alta / media / baja"), never raw numbers. */
function certainty(value: number): string {
	if (value >= 0.7) return "seguridad alta";
	if (value >= 0.4) return "seguridad media";
	return "seguridad baja";
}

/** "Dueño · IA media · AI Sales". Missing parts are skipped. */
export function segmentLabel(
	program: ProgramKey,
	seniority: SeniorityLevel | null,
	maturity: MaturityLevel | null,
): string {
	return [
		seniority ? SENIORITY_SHORT[seniority] : null,
		maturity ? `IA ${maturity.toLowerCase()}` : null,
		PROGRAM_LABEL[program],
	]
		.filter(Boolean)
		.join(" · ");
}

/**
 * Turns the engine's answers into a segment and a next action. The engine judges;
 * this function only compares numbers against the policy:
 *
 * 1. Missing answers or program confidence below `reviewFloor` → Revisión humana.
 * 2. Program assigned only if confidence ≥ `programConfidence` and the choice isn't "none".
 * 3. Assigned program + ready (≥ `salesReady`) + high seniority (≥ `seniorityHigh`) → asesor.
 * 4. No program or little context (< `contextFloor`) → nutrir con contenido gratis.
 * 5. Otherwise → enviar la propuesta del programa.
 */
export function decideSegment(
	answers: Record<string, DecisionAnswer> | null | undefined,
	policy: SegmentPolicy = defaultSegmentPolicy,
): SegmentDecision {
	const source = answers ?? {};
	const programAnswer = source.program;
	const seniorityAnswer = source.seniority;
	const salesReady = probability(source.sales_ready);
	const hasContext = probability(source.has_context);
	const seniority = levelOf(seniorityAnswer, SENIORITY_LEVELS);
	const maturity = levelOf(source.ai_maturity, MATURITY_LEVELS);

	const validProgram =
		programAnswer?.type === "choice" &&
		isProgramKey(programAnswer.choice) &&
		isUnitInterval(programAnswer.confidence);

	if (!validProgram || salesReady === null || hasContext === null || seniority === null) {
		return {
			program: "none",
			engineChoice: null,
			programConfidence: 0,
			seniority,
			maturity,
			salesReady: salesReady ?? 0,
			hasContext: hasContext ?? 0,
			action: "HUMAN_REVIEW",
			label: segmentLabel("none", seniority, maturity),
			reasons: [{ check: "missing", message: "La IA no pudo responder todas las preguntas" }],
		};
	}

	const engineChoice = programAnswer.choice as ProgramKey;
	const confidence = programAnswer.confidence;
	const seniorityScore = seniorityAnswer?.type === "score" ? seniorityAnswer.score : 0;
	const reasons: SegmentReason[] = [];

	const assigned: ProgramKey =
		engineChoice !== "none" && confidence >= policy.programConfidence ? engineChoice : "none";
	const base = {
		program: assigned,
		engineChoice,
		programConfidence: confidence,
		seniority,
		maturity,
		salesReady,
		hasContext,
		label: segmentLabel(assigned, seniority, maturity),
	};

	if (confidence < policy.reviewFloor) {
		reasons.push({
			check: "program_confidence",
			message: `La IA duda entre varios programas (${certainty(confidence)})`,
		});
		return { ...base, action: "HUMAN_REVIEW", reasons };
	}

	if (assigned !== "none") {
		reasons.push({
			check: "program",
			message: `Encaja con ${PROGRAM_LABEL[assigned]} (${certainty(confidence)})`,
		});
	} else if (engineChoice === "none") {
		reasons.push({ check: "program", message: "Su perfil no apunta a un programa concreto" });
	} else {
		reasons.push({
			check: "program_confidence",
			message: `Podría ser ${PROGRAM_LABEL[engineChoice]}, pero con ${certainty(confidence)}`,
		});
	}

	const ready = salesReady >= policy.salesReady;
	const senior = seniorityScore >= policy.seniorityHigh;
	if (ready) {
		reasons.push({ check: "sales_ready", message: "Muestra una necesidad concreta de negocio" });
	}
	if (senior) reasons.push({ check: "seniority", message: "Decide en su empresa" });

	if (assigned !== "none" && ready && senior) {
		return { ...base, action: "ADVISOR", reasons };
	}

	if (hasContext < policy.contextFloor) {
		reasons.push({
			check: "has_context",
			message: "Su perfil todavía dice poco de lo que necesita",
		});
		return { ...base, action: "NURTURE", reasons };
	}
	if (assigned === "none") return { ...base, action: "NURTURE", reasons };

	return { ...base, action: "PROPOSAL", reasons };
}
