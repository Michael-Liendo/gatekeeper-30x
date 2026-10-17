import { z } from "zod";
import { bulkUploadPieces } from "@/modules/workspace/application/bulk-upload";
import {
	bulkUploadErrorMessage,
	bulkUploadSchema,
} from "@/modules/workspace/application/workspace-schemas";
import {
	brandFor,
	currentUser,
	readJson,
	unauthorized,
} from "@/modules/workspace/infrastructure/piece-http";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

// Up to 200 JEV reviews, 8 at a time.
export const maxDuration = 300;

/**
 * Stores every piece of a content grid (Excel or CSV, parsed in the browser), reviews
 * each one with JEV against the user's brand and returns what was created and what failed.
 */
export async function POST(request: Request) {
	const user = await currentUser();
	if (!user) return unauthorized();

	const body = await readJson(request);
	if (!body.ok) return body.response;

	const parsed = bulkUploadSchema.safeParse(body.value);
	if (!parsed.success) {
		return Response.json(
			{
				error: bulkUploadErrorMessage(parsed.error),
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	const result = await bulkUploadPieces(parsed.data, user, brandFor(user), getWorkspaceDeps(), {
		onError: (index, error) => console.error(`[bulk] row ${index} failed`, error),
	});
	return Response.json(result, { status: 201 });
}
