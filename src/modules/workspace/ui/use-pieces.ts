"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspacePiece } from "../domain/workspace";
import { listPieces, messageOf } from "./workspace-api";

export type PiecesState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; pieces: WorkspacePiece[] };

/** The signed-in person's pieces (GET /api/pieces), with a local setter for optimistic moves. */
export function usePieces() {
	const [state, setState] = useState<PiecesState>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the fetch on retry.
	useEffect(() => {
		const controller = new AbortController();
		listPieces(controller.signal)
			.then((pieces) => setState({ status: "ready", pieces }))
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				setState({ status: "error", message: messageOf(error) });
			});
		return () => controller.abort();
	}, [attempt]);

	const retry = useCallback(() => {
		setState({ status: "loading" });
		setAttempt((value) => value + 1);
	}, []);

	const replace = useCallback((piece: WorkspacePiece) => {
		setState((current) =>
			current.status === "ready"
				? {
						status: "ready",
						pieces: current.pieces.map((p) => (p.id === piece.id ? piece : p)),
					}
				: current,
		);
	}, []);

	return { state, retry, replace };
}
