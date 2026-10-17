import { fetchJson } from "@/shared/ui/fetch-json";
import type { SegmentBatchResponse } from "../application/segment-batch";
import type { ResegmentResult, SegmentResult } from "../application/segment-profile";
import type { LeadProfile } from "../domain/profile";
import type { LeadForm } from "./options";

export interface SingleSegmentResponse {
	profile: LeadProfile;
	result: SegmentResult;
}

export function runSegmentBatch(size: 50 | 100 | 200 = 100): Promise<SegmentBatchResponse> {
	return fetchJson<SegmentBatchResponse>("/api/segment/run", { body: { size } });
}

export function segmentLead(lead: LeadForm): Promise<SingleSegmentResponse> {
	return fetchJson<SingleSegmentResponse>("/api/segment/profile", { body: lead });
}

/** Form fields of a profile (drops "Nivel de info": the server estimates it). */
export function toLeadForm(profile: LeadProfile): LeadForm {
	return {
		rol: profile.rol,
		pais: profile.pais,
		dolor: profile.dolor,
		objetivo: profile.objetivo,
		temas: [...profile.temas],
		relacion: profile.relacion,
	};
}

export function recalculate(
	profile: LeadProfile,
	cambios: Partial<LeadForm>,
): Promise<ResegmentResult> {
	return fetchJson<ResegmentResult>("/api/segment/profile", {
		body: { ...toLeadForm(profile), cambios },
	});
}
