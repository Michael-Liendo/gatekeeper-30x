// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile } from "../../brand/domain/brand-profile";
import type { ContentPiece } from "../../content-review/domain/content-piece";
import type { DecisionImage } from "../../content-review/domain/decision";
import type { Route } from "../../content-review/domain/editorial-policy";
import { SAMPLE_AUTHOR_NAME, SAMPLE_LOADED_SUMMARY } from "../domain/piece-timeline";
import type { TeamRole } from "../domain/workspace";
import { type Actor, createReviewedPiece } from "./piece-workflow";
import { runPool } from "./run-pool";
import type { WorkspaceDeps } from "./workspace-ports";

/**
 * How many examples of each expected route a new workspace starts with. Data, not
 * code: tune the mix here.
 */
export const DEMO_SEED_MIX: Readonly<Record<Route, number>> = {
	AUTO_APPROVE: 4,
	ENRICH_WITH_LLM: 3,
	HUMAN_REVIEW: 3,
	REJECT: 2,
};

/** How many examples (and JEV reviews) seeding makes at most. */
export const DEMO_SEED_SIZE = Object.values(DEMO_SEED_MIX).reduce((sum, n) => sum + n, 0);

/** Reviews running at the same time while seeding. */
export const DEMO_SEED_CONCURRENCY = 4;

/** Roles the example authors alternate between. */
const SAMPLE_ROLES: readonly TeamRole[] = ["design", "copy"];

/** Everything seeding needs: the workspace ports, the dataset and an image loader. */
export interface SeedDeps extends WorkspaceDeps {
	/** The simulated dataset to pick examples from. */
	samples: readonly ContentPiece[];
	/** Bytes of a sample's bundled image (`imagePath`), or null when it is missing. */
	loadSampleImage(imagePath: string): Promise<DecisionImage | null>;
}

/** The examples to load: the first N samples of each route, in dataset order per route. */
export function pickDemoSamples(
	samples: readonly ContentPiece[],
	mix: Readonly<Record<Route, number>> = DEMO_SEED_MIX,
): ContentPiece[] {
	const left: Record<Route, number> = { ...mix };
	return samples.filter((sample) => {
		const route = sample.expectedRoute;
		if (!route || left[route] <= 0) return false;
		left[route] -= 1;
		return true;
	});
}

async function seed(user: Pick<Actor, "id">, brand: BrandProfile, deps: SeedDeps): Promise<number> {
	const existing = new Set(deps.pieces.listSampleIds(user.id));
	const picked = pickDemoSamples(deps.samples);
	const missing = picked.filter((sample) => !existing.has(sample.id));
	let created = 0;

	await runPool(missing, DEMO_SEED_CONCURRENCY, async (sample) => {
		const index = picked.indexOf(sample);
		const image = sample.imagePath ? await deps.loadSampleImage(sample.imagePath) : null;
		await createReviewedPiece(
			{
				title: sample.title,
				body: sample.body,
				format: sample.format,
				channel: sample.channel,
				image,
				ownerId: user.id,
				authorName: SAMPLE_AUTHOR_NAME,
				authorRole: SAMPLE_ROLES[index % SAMPLE_ROLES.length] ?? "design",
				submittedSummary: SAMPLE_LOADED_SUMMARY,
				sampleId: sample.id,
			},
			brand,
			deps,
		);
		created += 1;
	});
	return created;
}

// Seeds in progress per user, so a double click (or onboarding + button) never doubles them.
const inFlight = new Map<string, Promise<number>>();

/**
 * Loads example pieces from the simulated dataset into the person's workspace, reviewed
 * by JEV with their brand like any upload. Idempotent: samples they already have are
 * skipped. Returns how many pieces were created.
 */
export function seedDemoPieces(
	user: Pick<Actor, "id">,
	brand: BrandProfile,
	deps: SeedDeps,
): Promise<number> {
	const running = inFlight.get(user.id);
	if (running) return running.then(() => 0);
	const job = seed(user, brand, deps).finally(() => inFlight.delete(user.id));
	inFlight.set(user.id, job);
	return job;
}

/** Removes the person's example pieces, their history and their images. Returns how many. */
export function removeDemoPieces(user: Pick<Actor, "id">, deps: WorkspaceDeps): number {
	const ids = deps.pieces.deleteExamples(user.id);
	for (const id of ids) deps.images.removeAll(id);
	return ids.length;
}
