import "server-only";
import { randomUUID } from "node:crypto";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";
import type { WorkspaceDeps } from "@/modules/workspace/application/workspace-ports";
import { imageStore } from "./image-store";
import { pieceEventRepository } from "./piece-event-repository";
import { pieceRepository } from "./piece-repository";

/** Real adapters for the workspace use cases: SQLite, files on disk, cached JEV. */
export function getWorkspaceDeps(): WorkspaceDeps {
	const { decide, suggest } = getReviewDeps();
	return {
		pieces: pieceRepository(),
		events: pieceEventRepository(),
		images: imageStore(),
		review: { decide, suggest },
		newId: randomUUID,
		now: () => new Date(),
	};
}
