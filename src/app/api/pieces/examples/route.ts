import { removeDemoPieces, seedDemoPieces } from "@/modules/workspace/application/seed-demo-pieces";
import { brandFor, currentUser, unauthorized } from "@/modules/workspace/infrastructure/piece-http";
import { getSeedDeps, getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";

/** Loads the demo example pieces into the user's workspace (idempotent). */
export async function POST() {
	const user = await currentUser();
	if (!user) return unauthorized();

	try {
		const created = await seedDemoPieces(user, brandFor(user), getSeedDeps());
		return Response.json({ created });
	} catch (error) {
		console.error("[examples] seeding failed", error);
		return Response.json(
			{ error: "No pudimos cargar las piezas de ejemplo. Intenta de nuevo en un momento." },
			{ status: 500 },
		);
	}
}

/** Removes the user's example pieces, with their history and images. */
export async function DELETE() {
	const user = await currentUser();
	if (!user) return unauthorized();
	return Response.json({ removed: removeDemoPieces(user, getWorkspaceDeps()) });
}
