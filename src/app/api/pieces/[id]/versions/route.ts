import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import {
	hasImageIssue,
	INVALID_IMAGE_MESSAGE,
} from "@/modules/content-review/application/review-schemas";
import { saveNewVersion } from "@/modules/workspace/application/piece-workflow";
import { newVersionSchema } from "@/modules/workspace/application/workspace-schemas";
import {
	brandFor,
	currentUser,
	readJson,
	unauthorized,
	workflowErrorResponse,
} from "@/modules/workspace/infrastructure/piece-http";
import { takeProposalReview } from "@/modules/workspace/infrastructure/proposal-reviews";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

/**
 * Saves `{ title, body, changes?, imageDataUrl? }` as the next version of the piece,
 * re-reviews it with JEV and returns the updated `WorkspacePiece`. Saving an unedited AI
 * proposal keeps the verdict JEV already gave it (no second call, no flip on save).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/pieces/[id]/versions">) {
	const user = await currentUser();
	if (!user) return unauthorized();
	const { id } = await ctx.params;

	const body = await readJson(request);
	if (!body.ok) return body.response;
	const parsed = newVersionSchema.safeParse(body.value);
	if (!parsed.success) {
		return Response.json(
			{
				error: hasImageIssue(parsed.error)
					? INVALID_IMAGE_MESSAGE
					: "Petición inválida: revisa título, texto (máx. 4000 caracteres) y cambios.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const knownReview = takeProposalReview(user.id, id, parsed.data);
	if (!knownReview) {
		const limited = enforceDailyLimit(user, { decisions: 1 });
		if (limited) return limited;
	}

	try {
		return Response.json(
			await saveNewVersion(id, parsed.data, user, brandFor(user), getWorkspaceDeps(), knownReview),
		);
	} catch (error) {
		return workflowErrorResponse(error);
	}
}
