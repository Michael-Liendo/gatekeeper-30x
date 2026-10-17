"use client";

import { useSession } from "@/modules/accounts/ui/session-provider";
import type { TeamRole, WorkspacePiece } from "../domain/workspace";
import { isTeamRole } from "./workspace-labels";

/** Role of the signed-in person, when the API sent one. */
export function useCurrentRole(): TeamRole | null {
	const { user } = useSession();
	const role: unknown = user ? (user as { role?: unknown }).role : undefined;
	return isTeamRole(role) ? role : null;
}

/** Role to show on a card: the person's current role for their own uploads (not examples). */
export function useAuthorRole(): (piece: WorkspacePiece) => TeamRole {
	const { user } = useSession();
	const current = useCurrentRole();
	return (piece) =>
		user && current && piece.authorId === user.id && !piece.isExample ? current : piece.authorRole;
}
