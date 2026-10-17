import { z } from "zod";
import { changePieceStatus, getPieceDetail } from "@/modules/workspace/application/piece-workflow";
import { changeStatusSchema } from "@/modules/workspace/application/workspace-schemas";
import {
	currentUser,
	readJson,
	unauthorized,
	workflowErrorResponse,
} from "@/modules/workspace/infrastructure/piece-http";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

/** `{ piece, events }` for one of the user's pieces (404 if it is not theirs). */
export async function GET(_request: Request, ctx: RouteContext<"/api/pieces/[id]">) {
	const user = await currentUser();
	if (!user) return unauthorized();
	const { id } = await ctx.params;
	try {
		return Response.json(getPieceDetail(id, user, getWorkspaceDeps()));
	} catch (error) {
		return workflowErrorResponse(error);
	}
}

/** Moves the piece to another status (`{ status, note? }`) and logs it. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/pieces/[id]">) {
	const user = await currentUser();
	if (!user) return unauthorized();
	const { id } = await ctx.params;

	const body = await readJson(request);
	if (!body.ok) return body.response;
	const parsed = changeStatusSchema.safeParse(body.value);
	if (!parsed.success) {
		return Response.json(
			{
				error: parsed.error.issues[0]?.message ?? "Petición inválida.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	try {
		return Response.json(changePieceStatus(id, parsed.data, user, getWorkspaceDeps()));
	} catch (error) {
		return workflowErrorResponse(error);
	}
}
