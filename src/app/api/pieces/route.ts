import { z } from "zod";
import { enforceDailyLimit } from "@/modules/accounts/infrastructure/daily-limit";
import {
	hasImageIssue,
	INVALID_IMAGE_MESSAGE,
} from "@/modules/content-review/application/review-schemas";
import { listPieces, submitPiece } from "@/modules/workspace/application/piece-workflow";
import {
	pieceStatusSchema,
	submitPieceSchema,
} from "@/modules/workspace/application/workspace-schemas";
import {
	badRequest,
	brandFor,
	currentUser,
	readJson,
	unauthorized,
} from "@/modules/workspace/infrastructure/piece-http";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

/** The signed-in user's pieces, newest first. Optional `?status=` filter. */
export async function GET(request: Request) {
	const user = await currentUser();
	if (!user) return unauthorized();

	const raw = new URL(request.url).searchParams.get("status");
	let status: z.infer<typeof pieceStatusSchema> | undefined;
	if (raw) {
		const parsed = pieceStatusSchema.safeParse(raw);
		if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Estado inválido.");
		status = parsed.data;
	}
	return Response.json(listPieces(user, status, getWorkspaceDeps()));
}

/**
 * Stores a new piece (text, PNG/JPEG screenshot as a `data:` URL, or both), reviews it
 * with JEV against the user's brand and returns the saved `WorkspacePiece`.
 */
export async function POST(request: Request) {
	const user = await currentUser();
	if (!user) return unauthorized();

	const body = await readJson(request);
	if (!body.ok) return body.response;

	const parsed = submitPieceSchema.safeParse(body.value);
	if (!parsed.success) {
		return Response.json(
			{
				error: hasImageIssue(parsed.error)
					? INVALID_IMAGE_MESSAGE
					: "Petición inválida: envía texto (máx. 4000 caracteres) o una captura, y revisa formato y canal.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const limited = enforceDailyLimit(user, { decisions: 1 });
	if (limited) return limited;

	const piece = await submitPiece(parsed.data, user, brandFor(user), getWorkspaceDeps());
	return Response.json(piece, { status: 201 });
}
