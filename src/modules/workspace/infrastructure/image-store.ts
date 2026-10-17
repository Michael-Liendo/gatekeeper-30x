import "server-only";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DecisionImage } from "@/modules/content-review/domain/decision";
import type { ImageStore } from "@/modules/workspace/application/workspace-ports";
import { env } from "@/shared/config/env";

const EXTENSION: Record<DecisionImage["mimeType"], string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
};

const FILE_PATTERN = /^[\w-]+-v\d+\.(png|jpg)$/;
const VERSION_SUFFIX = /^-v\d+\.(png|jpg)$/;

/** Screenshots as plain files: `<dir>/<pieceId>-v<version>.<png|jpg>`. */
export function createImageStore(dir: string): ImageStore {
	return {
		save(pieceId, version, image) {
			mkdirSync(dir, { recursive: true });
			const fileName = `${pieceId}-v${version}.${EXTENSION[image.mimeType]}`;
			writeFileSync(path.join(dir, fileName), Buffer.from(image.base64, "base64"));
			return fileName;
		},
		read(fileName) {
			// File names come from our own database; refuse anything else (no path traversal).
			const match = FILE_PATTERN.exec(fileName);
			if (!match) return null;
			try {
				const bytes = readFileSync(path.join(dir, fileName));
				return { mimeType: match[1] === "png" ? "image/png" : "image/jpeg", bytes };
			} catch {
				return null;
			}
		},
		removeAll(pieceId) {
			const prefix = `${pieceId}-v`;
			let files: string[];
			try {
				files = readdirSync(dir);
			} catch {
				return;
			}
			for (const file of files) {
				if (file.startsWith(prefix) && VERSION_SUFFIX.test(file.slice(pieceId.length))) {
					rmSync(path.join(dir, file), { force: true });
				}
			}
		},
	};
}

let defaultStore: ImageStore | undefined;

/** Store under `${DATA_DIR}/uploads`. */
export function imageStore(): ImageStore {
	defaultStore ??= createImageStore(path.join(env.DATA_DIR ?? "./data", "uploads"));
	return defaultStore;
}
