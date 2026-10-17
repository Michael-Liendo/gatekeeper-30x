import { getPieceImage } from "@/modules/workspace/application/piece-workflow";
import {
	currentUser,
	unauthorized,
	workflowErrorResponse,
} from "@/modules/workspace/infrastructure/piece-http";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

/** The current screenshot of one of the user's pieces. */
export async function GET(_request: Request, ctx: RouteContext<"/api/pieces/[id]/image">) {
	const user = await currentUser();
	if (!user) return unauthorized();
	const { id } = await ctx.params;

	try {
		const image = getPieceImage(id, user, getWorkspaceDeps());
		if (!image) {
			return Response.json({ error: "Esta pieza no tiene captura." }, { status: 404 });
		}
		return new Response(new Uint8Array(image.bytes), {
			headers: {
				"Content-Type": image.mimeType,
				"Cache-Control": "private, no-cache",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		return workflowErrorResponse(error);
	}
}
