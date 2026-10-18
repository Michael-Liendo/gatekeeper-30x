"use client";

import { useEffect, useState } from "react";
import { CHANNEL_LABEL } from "@/modules/content-review/ui/labels";
import { CheckIcon, SparkleIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import type { WorkspacePiece } from "../domain/workspace";

/** Demo only: nothing is posted. The "published" mark is kept in this browser. */
const PUBLISH_DELAY_MS = 1200;

function storageKey(pieceId: string): string {
	return `gk-demo-published:${pieceId}`;
}

function readPublished(pieceId: string): boolean {
	try {
		return window.localStorage.getItem(storageKey(pieceId)) !== null;
	} catch {
		return false;
	}
}

function markPublished(pieceId: string): void {
	try {
		window.localStorage.setItem(storageKey(pieceId), new Date().toISOString());
	} catch {
		// Storage blocked: the mark lasts until the page reloads.
	}
}

type State = "idle" | "publishing" | "published";

/** "Publicar en redes" for an approved piece; simulates the post for the demo. */
export function DemoPublishButton({ piece }: { piece: WorkspacePiece }) {
	const { notify } = useToast();
	const [state, setState] = useState<State>("idle");
	const network = CHANNEL_LABEL[piece.channel] ?? "tus redes";

	useEffect(() => {
		if (readPublished(piece.id)) setState("published");
	}, [piece.id]);

	function publish() {
		setState("publishing");
		window.setTimeout(() => {
			markPublished(piece.id);
			setState("published");
			notify(`Publicado en ${network}`);
		}, PUBLISH_DELAY_MS);
	}

	if (state === "published") {
		return (
			<p
				role="status"
				className="relative z-10 flex items-center justify-center gap-2 rounded-full bg-surface-muted px-4 py-2.5 text-sm font-medium"
			>
				<CheckIcon size={16} />
				Publicado en {network}
			</p>
		);
	}

	return (
		<button
			type="button"
			onClick={publish}
			disabled={state === "publishing"}
			aria-busy={state === "publishing"}
			className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-70"
		>
			<SparkleIcon
				size={16}
				className={state === "publishing" ? "motion-safe:animate-pulse" : ""}
			/>
			{state === "publishing" ? `Publicando en ${network}…` : "Publicar en redes"}
		</button>
	);
}
