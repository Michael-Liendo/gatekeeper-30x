import type { DecisionAnswer } from "./decision";

/** Where a piece goes after the decision engine answers the editorial questions. */
export type Route = "AUTO_APPROVE" | "ENRICH_WITH_LLM" | "HUMAN_REVIEW" | "REJECT";

/** A rule that fired, with the value that triggered it and a Spanish explanation for the UI. */
export interface Reason {
	check: string;
	value: number;
	message: string;
}

export interface EditorialDecision {
	route: Route;
	/** Composite editorial score in [0, 1]. 0 when answers are missing. */
	editorialScore: number;
	/** Lowest confidence across all answers. 0 when answers are missing. */
	minConfidence: number;
	reasons: Reason[];
}

/**
 * Tunable thresholds and weights. This is data, not code: the Media team edits it
 * from the rules panel and decisions update without a deploy.
 */
export interface EditorialPolicy {
	/** Every answer must reach this confidence to auto-approve. */
	autoApproveConfidence: number;
	/** Below this confidence a person decides. Between this and autoApproveConfidence is the gray zone. */
	grayZoneFloor: number;
	/** Brand risk, exaggerated promises or unsold product at or above this → human review. */
	riskBlock: number;
	/** Spam probability at or above this → reject. */
	spamReject: number;
	/** Minimum composite editorial score to auto-approve. */
	minEditorialScore: number;
	/** A yes/no flag at or above this counts as "red" and blocks auto-approval. */
	flagThreshold: number;
	weights: {
		relevance: number;
		actionable: number;
		promotional: number;
		unsourced: number;
	};
}

export const defaultEditorialPolicy: EditorialPolicy = {
	autoApproveConfidence: 0.85,
	grayZoneFloor: 0.6,
	riskBlock: 0.7,
	spamReject: 0.85,
	minEditorialScore: 0.75,
	flagThreshold: 0.5,
	weights: {
		relevance: 0.5,
		actionable: 0.5,
		promotional: 0.5,
		unsourced: 0.5,
	},
};

const YES_NO_KEYS = [
	"too_promotional",
	"exaggerated_promises",
	"unsourced_claims",
	"brand_risk",
	"offers_unsold_product",
	"is_spam",
] as const;

const CHOICE_KEYS = ["topic", "format"] as const;
const SCORE_KEYS = ["relevance", "actionable"] as const;

type YesNoKey = (typeof YES_NO_KEYS)[number];

const RISK_KEYS = ["brand_risk", "exaggerated_promises", "offers_unsold_product"] as const;

const FLAG_LABELS: Record<YesNoKey, string> = {
	too_promotional: "Demasiado promocional",
	exaggerated_promises: "Promesas exageradas",
	unsourced_claims: "Datos sin fuente",
	brand_risk: "Riesgo de marca",
	offers_unsold_product: "Ofrece algo que 30X no vende",
	is_spam: "Spam",
};

/** Formats a number the Spanish way: 0.913 → "0,91". */
function formatValue(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

function reason(check: string, value: number, label: string): Reason {
	return { check, value, message: `${label} (${formatValue(value)})` };
}

function isUnitInterval(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

interface ValidAnswers {
	flags: Record<YesNoKey, number>;
	topic: { choice: string; confidence: number };
	format: { choice: string; confidence: number };
	/** Normalized to [0, 1] (score / highest level index). */
	relevance: { value: number; confidence: number };
	actionable: { value: number; confidence: number };
}

/** Returns the parsed answers, or the list of missing/invalid keys. */
function validate(
	answers: Record<string, DecisionAnswer> | null | undefined,
): { ok: true; value: ValidAnswers } | { ok: false; invalid: string[] } {
	const invalid: string[] = [];
	const source = answers ?? {};

	const flags = {} as Record<YesNoKey, number>;
	for (const key of YES_NO_KEYS) {
		const answer = source[key];
		if (answer?.type === "yes_no" && isUnitInterval(answer.probability)) {
			flags[key] = answer.probability;
		} else {
			invalid.push(key);
		}
	}

	const choices = {} as Record<
		(typeof CHOICE_KEYS)[number],
		{ choice: string; confidence: number }
	>;
	for (const key of CHOICE_KEYS) {
		const answer = source[key];
		if (
			answer?.type === "choice" &&
			typeof answer.choice === "string" &&
			answer.choice.length > 0 &&
			isUnitInterval(answer.confidence)
		) {
			choices[key] = { choice: answer.choice, confidence: answer.confidence };
		} else {
			invalid.push(key);
		}
	}

	const scores = {} as Record<(typeof SCORE_KEYS)[number], { value: number; confidence: number }>;
	for (const key of SCORE_KEYS) {
		const answer = source[key];
		const maxLevel = answer?.type === "score" ? answer.probabilities.length - 1 : 0;
		if (
			answer?.type === "score" &&
			maxLevel > 0 &&
			Number.isFinite(answer.score) &&
			answer.score >= 0 &&
			answer.score <= maxLevel &&
			isUnitInterval(answer.confidence)
		) {
			scores[key] = { value: answer.score / maxLevel, confidence: answer.confidence };
		} else {
			invalid.push(key);
		}
	}

	if (invalid.length > 0) return { ok: false, invalid };
	return {
		ok: true,
		value: {
			flags,
			topic: choices.topic,
			format: choices.format,
			relevance: scores.relevance,
			actionable: scores.actionable,
		},
	};
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/**
 * Composite editorial score, clamped to [0, 1]:
 *
 *   editorialScore = w.relevance   × relevance / maxLevel
 *                  + w.actionable  × actionable / maxLevel
 *                  − w.promotional × P(too_promotional)
 *                  − w.unsourced   × P(unsourced_claims)
 *
 * With the default weights (0.5 each) a fully relevant, fully actionable piece with
 * no promotional or unsourced content scores 1.
 */
function computeEditorialScore(answers: ValidAnswers, policy: EditorialPolicy): number {
	const w = policy.weights;
	return clamp01(
		w.relevance * answers.relevance.value +
			w.actionable * answers.actionable.value -
			w.promotional * answers.flags.too_promotional -
			w.unsourced * answers.flags.unsourced_claims,
	);
}

/**
 * Turns typed answers into a route. Rules apply in priority order; every rule that
 * fires is reported in `reasons` so the editor (and the LLM fixer) see the full why.
 *
 * 1. Missing or invalid answers → HUMAN_REVIEW (never approve without data).
 * 2. Spam ≥ spamReject, or topic "other" with high confidence and spam ≥ flagThreshold → REJECT.
 * 3. Brand risk, exaggerated promises or unsold product ≥ riskBlock → HUMAN_REVIEW.
 * 4. Min confidence < grayZoneFloor, or topic "other" → HUMAN_REVIEW.
 * 5. All confidences ≥ autoApproveConfidence, no flag ≥ flagThreshold and
 *    editorialScore ≥ minEditorialScore → AUTO_APPROVE.
 * 6. Otherwise → ENRICH_WITH_LLM (gray zone).
 *
 * For yes/no answers, confidence = max(p, 1 − p).
 */
export function decideRoute(
	answers: Record<string, DecisionAnswer> | null | undefined,
	policy: EditorialPolicy = defaultEditorialPolicy,
): EditorialDecision {
	const parsed = validate(answers);
	if (!parsed.ok) {
		return {
			route: "HUMAN_REVIEW",
			editorialScore: 0,
			minConfidence: 0,
			reasons: parsed.invalid.map((key) => ({
				check: `missing_${key}`,
				value: 0,
				message: `Falta la respuesta: ${key}`,
			})),
		};
	}

	const a = parsed.value;
	const editorialScore = computeEditorialScore(a, policy);
	const confidences = [
		a.topic.confidence,
		a.format.confidence,
		a.relevance.confidence,
		a.actionable.confidence,
		...YES_NO_KEYS.map((key) => Math.max(a.flags[key], 1 - a.flags[key])),
	];
	const minConfidence = Math.min(...confidences);
	const isOtherTopic = a.topic.choice === "other";

	// Collect every rule that fires; the route is the highest-priority one.
	const reasons: Reason[] = [];

	const spam = a.flags.is_spam;
	const isSpam = spam >= policy.spamReject;
	const isOffTopicSpam =
		isOtherTopic &&
		a.topic.confidence >= policy.autoApproveConfidence &&
		spam >= policy.flagThreshold;
	if (isSpam) reasons.push(reason("is_spam", spam, FLAG_LABELS.is_spam));
	else if (isOffTopicSpam)
		reasons.push(reason("is_spam", spam, "Fuera de tema y con señales de spam"));

	let riskBlocked = false;
	for (const key of RISK_KEYS) {
		if (a.flags[key] >= policy.riskBlock) {
			riskBlocked = true;
			reasons.push(reason(key, a.flags[key], FLAG_LABELS[key]));
		}
	}

	const lowConfidence = minConfidence < policy.grayZoneFloor;
	if (lowConfidence) reasons.push(reason("min_confidence", minConfidence, "Confianza baja"));
	if (isOtherTopic) reasons.push(reason("topic", a.topic.confidence, 'Tema "Otro"'));

	// Remaining yes/no flags in red (risk flags and spam already reported above).
	let anyFlagRed = false;
	for (const key of YES_NO_KEYS) {
		const value = a.flags[key];
		if (value < policy.flagThreshold) continue;
		anyFlagRed = true;
		const alreadyReported = reasons.some((r) => r.check === key);
		if (!alreadyReported) reasons.push(reason(key, value, FLAG_LABELS[key]));
	}

	const lowScore = editorialScore < policy.minEditorialScore;
	if (lowScore) reasons.push(reason("editorial_score", editorialScore, "Puntaje editorial bajo"));

	const notConfidentEnough = minConfidence < policy.autoApproveConfidence;
	if (notConfidentEnough && !lowConfidence) {
		reasons.push(reason("min_confidence", minConfidence, "Confianza en zona gris"));
	}

	let route: Route;
	if (isSpam || isOffTopicSpam) route = "REJECT";
	else if (riskBlocked || lowConfidence || isOtherTopic) route = "HUMAN_REVIEW";
	else if (!notConfidentEnough && !anyFlagRed && !lowScore) route = "AUTO_APPROVE";
	else route = "ENRICH_WITH_LLM";

	return { route, editorialScore, minConfidence, reasons };
}

/** Human-readable list of what failed, to tell the LLM fixer what to correct. */
export function failedChecks(reasons: readonly Reason[]): string[] {
	return reasons.map((r) => r.message);
}
