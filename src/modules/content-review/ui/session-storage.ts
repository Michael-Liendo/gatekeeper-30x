import { defaultEditorialPolicy, type EditorialPolicy } from "../domain/editorial-policy";
import type { EditorialSuggestions, ReviewResult } from "../domain/review";

/** Shape persisted in localStorage so a reload keeps the analysis and the tuning. */
export interface PersistedSession {
	version: 1;
	policy: EditorialPolicy;
	batch: ReviewResult[];
	submitted: ReviewResult[];
	editorActions: Record<string, EditorAction>;
	suggestions: Record<string, EditorialSuggestions>;
	runMs: number | null;
	analyzedAt: string | null;
}

/** Simulated editor decision on a piece in the queue. Local only. */
export type EditorAction = "approved" | "rejected" | "adjusted";

const STORAGE_KEY = "gatekeeper-30x:session";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnit(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function readPolicy(value: unknown): EditorialPolicy {
	const policy: EditorialPolicy = {
		...defaultEditorialPolicy,
		weights: { ...defaultEditorialPolicy.weights },
	};
	if (!isRecord(value)) return policy;
	for (const key of Object.keys(policy) as (keyof EditorialPolicy)[]) {
		if (key === "weights") continue;
		const candidate = value[key];
		if (isUnit(candidate)) policy[key] = candidate;
	}
	if (isRecord(value.weights)) {
		for (const key of Object.keys(policy.weights) as (keyof EditorialPolicy["weights"])[]) {
			const candidate = value.weights[key];
			if (isUnit(candidate)) policy.weights[key] = candidate;
		}
	}
	return policy;
}

/** Loose check: enough structure for the panel to render without crashing. */
function isReviewResult(value: unknown): value is ReviewResult {
	return (
		isRecord(value) &&
		isRecord(value.piece) &&
		typeof value.piece.id === "string" &&
		typeof value.piece.title === "string" &&
		typeof value.route === "string" &&
		isRecord(value.answers) &&
		Array.isArray(value.reasons)
	);
}

function readResults(value: unknown): ReviewResult[] {
	return Array.isArray(value) ? value.filter(isReviewResult) : [];
}

const EDITOR_ACTIONS: readonly string[] = ["approved", "rejected", "adjusted"];

function readEditorActions(value: unknown): Record<string, EditorAction> {
	const out: Record<string, EditorAction> = {};
	if (!isRecord(value)) return out;
	for (const [id, action] of Object.entries(value)) {
		if (typeof action === "string" && EDITOR_ACTIONS.includes(action)) {
			out[id] = action as EditorAction;
		}
	}
	return out;
}

function readSuggestions(value: unknown): Record<string, EditorialSuggestions> {
	const out: Record<string, EditorialSuggestions> = {};
	if (!isRecord(value)) return out;
	for (const [id, s] of Object.entries(value)) {
		if (
			isRecord(s) &&
			typeof s.suggestedTitle === "string" &&
			Array.isArray(s.summary) &&
			Array.isArray(s.fixes)
		) {
			out[id] = {
				suggestedTitle: s.suggestedTitle,
				summary: s.summary.filter((x): x is string => typeof x === "string"),
				fixes: s.fixes.filter((x): x is string => typeof x === "string"),
			};
		}
	}
	return out;
}

export function loadSession(): PersistedSession | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const data: unknown = JSON.parse(raw);
		if (!isRecord(data) || data.version !== 1) return null;
		return {
			version: 1,
			policy: readPolicy(data.policy),
			batch: readResults(data.batch),
			submitted: readResults(data.submitted),
			editorActions: readEditorActions(data.editorActions),
			suggestions: readSuggestions(data.suggestions),
			runMs: typeof data.runMs === "number" ? data.runMs : null,
			analyzedAt: typeof data.analyzedAt === "string" ? data.analyzedAt : null,
		};
	} catch {
		return null;
	}
}

export function saveSession(session: PersistedSession): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	} catch {
		// Storage full or blocked (private mode): the session just won't survive a reload.
	}
}

export function clearSession(): void {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore: nothing to clear.
	}
}
