import "server-only";
import { randomUUID } from "node:crypto";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";
import { sampleContent } from "@/modules/content-review/infrastructure/sample-content";
import type { SeedDeps } from "@/modules/workspace/application/seed-demo-pieces";
import type { WorkspaceDeps } from "@/modules/workspace/application/workspace-ports";
import { imageStore } from "./image-store";
import { pieceEventRepository } from "./piece-event-repository";
import { pieceRepository } from "./piece-repository";
import { loadSampleImage } from "./sample-image-loader";

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

/** Workspace adapters plus the simulated dataset and its bundled images (demo examples). */
export function getSeedDeps(): SeedDeps {
	return { ...getWorkspaceDeps(), samples: sampleContent, loadSampleImage };
}
