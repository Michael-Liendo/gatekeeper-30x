"use client";

import { createContext, type ReactNode, use } from "react";
import { type ReviewSession, useReviewSession } from "./use-review-session";

const ReviewSessionContext = createContext<ReviewSession | null>(null);

/** Shares one review session across every page of the editor app. */
export function ReviewSessionProvider({ children }: { children: ReactNode }) {
	const session = useReviewSession();
	return <ReviewSessionContext value={session}>{children}</ReviewSessionContext>;
}

export function useReview(): ReviewSession {
	const session = use(ReviewSessionContext);
	if (!session) throw new Error("useReview must be used inside ReviewSessionProvider");
	return session;
}
