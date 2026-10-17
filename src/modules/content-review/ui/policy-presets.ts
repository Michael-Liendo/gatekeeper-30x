import { defaultEditorialPolicy, type EditorialPolicy } from "../domain/editorial-policy";
import { isSamePolicy } from "./apply-policy";

/**
 * Three ready-made policies for people who don't want to touch thresholds.
 * Data, not code: the Media team tunes the numbers here. "Equilibrado" is the
 * calibrated default.
 */
export type PresetId = "strict" | "balanced" | "flexible";

export interface PolicyPreset {
	id: PresetId;
	name: string;
	summary: string;
	policy: EditorialPolicy;
}

export const POLICY_PRESETS: readonly PolicyPreset[] = [
	{
		id: "strict",
		name: "Estricto",
		summary: "Te llega más contenido para revisar. Solo se aprueba solo lo que está muy claro.",
		policy: {
			...defaultEditorialPolicy,
			autoApproveConfidence: 0.65,
			grayZoneFloor: 0.3,
			riskBlock: 0.45,
			spamReject: 0.5,
			minEditorialScore: 0.6,
			flagThreshold: 0.4,
		},
	},
	{
		id: "balanced",
		name: "Equilibrado",
		summary: "Recomendado. Ajustado con contenido real de 30X: nada arriesgado se aprueba solo.",
		policy: defaultEditorialPolicy,
	},
	{
		id: "flexible",
		name: "Flexible",
		summary: "Más contenido se aprueba solo y revisas menos. Lo arriesgado sigue llegando a ti.",
		policy: {
			...defaultEditorialPolicy,
			autoApproveConfidence: 0.4,
			grayZoneFloor: 0.15,
			riskBlock: 0.7,
			spamReject: 0.7,
			minEditorialScore: 0.4,
			flagThreshold: 0.6,
		},
	},
];

/** The preset that matches the policy exactly, or null for a custom one. */
export function matchingPreset(policy: EditorialPolicy): PolicyPreset | null {
	return POLICY_PRESETS.find((preset) => isSamePolicy(preset.policy, policy)) ?? null;
}
