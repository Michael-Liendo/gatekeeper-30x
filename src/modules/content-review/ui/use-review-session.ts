"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentPiece } from "../domain/content-piece";
import { defaultEditorialPolicy, type EditorialPolicy } from "../domain/editorial-policy";
import { computeMetrics } from "../domain/metrics";
import type { EditorialSuggestions, ReviewMetrics, ReviewResult } from "../domain/review";
import {
	enrichPiece,
	errorMessage,
	fetchContent,
	type ReviewPieceRequest,
	reviewBatch,
	reviewPiece,
} from "./api";
import { applyPolicy } from "./apply-policy";
import {
	clearSession,
	type EditorAction,
	loadSession,
	type PersistedSession,
	saveSession,
} from "./session-storage";

export type { EditorAction } from "./session-storage";

export type RunStatus = "idle" | "running" | "ready";

export type SubmitInput = Omit<ReviewPieceRequest, "policy" | "enrich">;

export type EnrichState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "done"; suggestions: EditorialSuggestions };

export interface ReviewSession {
	/** False until the browser state (localStorage) has been read. */
	hydrated: boolean;
	pieces: ContentPiece[];
	status: RunStatus;
	runError: string | null;
	runMs: number | null;
	analyzedAt: string | null;
	policy: EditorialPolicy;
	/** Batch + submitted pieces, re-routed with the current policy. Submitted first. */
	results: ReviewResult[];
	/** Route each piece had when the server reviewed it, to show what the policy changed. */
	originalRoutes: ReadonlyMap<string, ReviewResult["route"]>;
	submittedIds: ReadonlySet<string>;
	metrics: ReviewMetrics | null;
	changedIds: ReadonlySet<string>;
	editorActions: Readonly<Record<string, EditorAction>>;
	enrichments: Readonly<Record<string, EnrichState>>;
	/** Pieces that need the editor and have no decision yet. */
	pendingCount: number;
	run: () => Promise<void>;
	setPolicy: (policy: EditorialPolicy) => void;
	resetPolicy: () => void;
	setEditorAction: (id: string, action: EditorAction | null) => void;
	enrich: (id: string) => Promise<void>;
	submit: (input: SubmitInput) => Promise<ReviewResult>;
	clearAll: () => void;
}

export const QUEUE_ROUTES: ReadonlySet<ReviewResult["route"]> = new Set([
	"HUMAN_REVIEW",
	"ENRICH_WITH_LLM",
]);

/** Large screenshots would blow the ~5 MB localStorage quota: keep them in memory only. */
const MAX_PERSISTED_IMAGE_CHARS = 400_000;

function withoutLargeImage(result: ReviewResult): ReviewResult {
	const piece: ContentPiece & { imageDataUrl?: unknown } = result.piece;
	if (
		typeof piece.imageDataUrl === "string" &&
		piece.imageDataUrl.length > MAX_PERSISTED_IMAGE_CHARS
	) {
		const { imageDataUrl: _dropped, ...rest } = piece;
		return { ...result, piece: rest };
	}
	return result;
}

/** Client state of the editor app: analysis, policy tuning, submissions and editor decisions. */
export function useReviewSession(): ReviewSession {
	const [hydrated, setHydrated] = useState(false);
	const [pieces, setPieces] = useState<ContentPiece[]>([]);
	const [batch, setBatch] = useState<ReviewResult[]>([]);
	const [submitted, setSubmitted] = useState<ReviewResult[]>([]);
	const [status, setStatus] = useState<RunStatus>("idle");
	const [runError, setRunError] = useState<string | null>(null);
	const [runMs, setRunMs] = useState<number | null>(null);
	const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
	const [policy, setPolicy] = useState<EditorialPolicy>(defaultEditorialPolicy);
	const [editorActions, setEditorActions] = useState<Record<string, EditorAction>>({});
	const [enrichments, setEnrichments] = useState<Record<string, EnrichState>>({});

	// Restore the previous session once, after mount (localStorage is browser-only).
	useEffect(() => {
		const stored = loadSession();
		if (stored) {
			setPolicy(stored.policy);
			setBatch(stored.batch);
			setSubmitted(stored.submitted);
			setEditorActions(stored.editorActions);
			setEnrichments(
				Object.fromEntries(
					Object.entries(stored.suggestions).map(([id, suggestions]) => [
						id,
						{ status: "done", suggestions } satisfies EnrichState,
					]),
				),
			);
			setRunMs(stored.runMs);
			setAnalyzedAt(stored.analyzedAt);
			if (stored.batch.length > 0) setStatus("ready");
		}
		setHydrated(true);
	}, []);

	// The dataset preview tells the user how many pieces an analysis will cover.
	useEffect(() => {
		let cancelled = false;
		fetchContent()
			.then((data) => {
				if (!cancelled && Array.isArray(data)) setPieces(data);
			})
			.catch(() => {
				// Not critical: the analyze button still works without the count.
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		const suggestions: Record<string, EditorialSuggestions> = {};
		for (const [id, state] of Object.entries(enrichments)) {
			if (state.status === "done") suggestions[id] = state.suggestions;
		}
		const session: PersistedSession = {
			version: 1,
			policy,
			batch,
			submitted: submitted.map(withoutLargeImage),
			editorActions,
			suggestions,
			runMs,
			analyzedAt,
		};
		saveSession(session);
	}, [hydrated, policy, batch, submitted, editorActions, enrichments, runMs, analyzedAt]);

	const baseline = useMemo(() => [...submitted, ...batch], [submitted, batch]);
	const results = useMemo(
		() => baseline.map((result) => applyPolicy(result, policy)),
		[baseline, policy],
	);
	const originalRoutes = useMemo(
		() => new Map(baseline.map((result) => [result.piece.id, result.route])),
		[baseline],
	);
	const submittedIds = useMemo(() => new Set(submitted.map((r) => r.piece.id)), [submitted]);
	const metrics = useMemo(
		() =>
			batch.length === 0
				? null
				: computeMetrics(results.filter((r) => !submittedIds.has(r.piece.id))),
		[batch.length, results, submittedIds],
	);
	const changedIds = useMemo(() => {
		const ids = new Set<string>();
		for (const result of results) {
			if (originalRoutes.get(result.piece.id) !== result.route) ids.add(result.piece.id);
		}
		return ids;
	}, [results, originalRoutes]);
	const pendingCount = useMemo(
		() => results.filter((r) => QUEUE_ROUTES.has(r.route) && !editorActions[r.piece.id]).length,
		[results, editorActions],
	);

	const run = useCallback(async () => {
		setStatus("running");
		setRunError(null);
		const startedAt = performance.now();
		try {
			const response = await reviewBatch({ policy });
			setBatch(response.results);
			setRunMs(performance.now() - startedAt);
			setAnalyzedAt(new Date().toISOString());
			setEditorActions((current) => {
				// Keep decisions on submitted pieces; batch decisions start over.
				const kept: Record<string, EditorAction> = {};
				for (const id of submitted.map((r) => r.piece.id)) {
					if (current[id]) kept[id] = current[id];
				}
				return kept;
			});
			setStatus("ready");
		} catch (error) {
			setRunError(errorMessage(error));
			setStatus((current) => (current === "running" && batch.length > 0 ? "ready" : "idle"));
		}
	}, [policy, submitted, batch.length]);

	const resetPolicy = useCallback(() => setPolicy(defaultEditorialPolicy), []);

	const setEditorAction = useCallback((id: string, action: EditorAction | null) => {
		setEditorActions((current) => {
			const next = { ...current };
			if (action) next[id] = action;
			else delete next[id];
			return next;
		});
	}, []);

	const enrich = useCallback(async (id: string) => {
		setEnrichments((current) => ({ ...current, [id]: { status: "loading" } }));
		try {
			const suggestions = await enrichPiece(id);
			setEnrichments((current) => ({ ...current, [id]: { status: "done", suggestions } }));
		} catch (error) {
			setEnrichments((current) => ({
				...current,
				[id]: { status: "error", message: errorMessage(error) },
			}));
		}
	}, []);

	const submit = useCallback(
		async (input: SubmitInput) => {
			// Errors propagate as ApiError with a Spanish message for the form to show.
			const result = await reviewPiece({ ...input, policy, enrich: true });
			setSubmitted((current) => [result, ...current.filter((r) => r.piece.id !== result.piece.id)]);
			if (result.suggestions) {
				const suggestions = result.suggestions;
				setEnrichments((current) => ({
					...current,
					[result.piece.id]: { status: "done", suggestions },
				}));
			}
			return result;
		},
		[policy],
	);

	const clearAll = useCallback(() => {
		clearSession();
		setBatch([]);
		setSubmitted([]);
		setEditorActions({});
		setEnrichments({});
		setRunMs(null);
		setAnalyzedAt(null);
		setPolicy(defaultEditorialPolicy);
		setStatus("idle");
	}, []);

	return {
		hydrated,
		pieces,
		status,
		runError,
		runMs,
		analyzedAt,
		policy,
		results,
		originalRoutes,
		submittedIds,
		metrics,
		changedIds,
		editorActions,
		enrichments,
		pendingCount,
		run,
		setPolicy,
		resetPolicy,
		setEditorAction,
		enrich,
		submit,
		clearAll,
	};
}
