import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatasetProfile } from "../domain/profile";
import { parseCsvRecords } from "./csv";
import { toDatasetProfile } from "./profile-records";

const FILE_NAME = "perfiles-30x.csv";

let cached: readonly DatasetProfile[] | undefined;

/**
 * Candidate locations: the asset the bundler emits for `new URL(..., import.meta.url)`
 * (standalone build), then `data/` next to the server (`next dev`, scripts).
 */
function candidates(): string[] {
	const out: string[] = [];
	try {
		out.push(fileURLToPath(new URL("../../../../data/perfiles-30x.csv", import.meta.url)));
	} catch {
		// Not a file: URL in this runtime; fall through to cwd.
	}
	out.push(path.join(process.cwd(), "data", FILE_NAME));
	return out;
}

function readCsv(): string {
	for (const file of candidates()) {
		try {
			return readFileSync(file, "utf8");
		} catch {
			// Try the next location.
		}
	}
	throw new Error(`Profile dataset ${FILE_NAME} not found`);
}

/** 30X's anonymized sign-up profiles, parsed once per process. */
export function loadProfiles(): readonly DatasetProfile[] {
	cached ??= parseCsvRecords(readCsv())
		.map(toDatasetProfile)
		.filter((row): row is DatasetProfile => row !== null);
	return cached;
}
