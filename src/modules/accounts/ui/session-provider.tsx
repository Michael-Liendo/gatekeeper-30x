"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useCallback, useEffect, useState } from "react";
import type { BrandProfile, UserAccount } from "@/modules/brand/domain/brand-profile";
import { ApiError } from "@/shared/ui/fetch-json";
import { fetchMe } from "./auth-api";

export interface Session {
	/** "unavailable" when /api/me failed for a reason other than 401 (e.g. backend not deployed). */
	status: "loading" | "ready" | "unavailable";
	user: UserAccount | null;
	brand: BrandProfile | null;
	/** Replaces the brand after it is saved, so the shell updates without a refetch. */
	setBrand: (brand: BrandProfile) => void;
	/** Replaces the user after a profile change (e.g. role). */
	setUser: (user: UserAccount) => void;
}

const SessionContext = createContext<Session | null>(null);

/**
 * Loads the signed-in user and their brand (GET /api/me) for the editor app.
 * No session → /ingresar; session without brand → /bienvenida.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [status, setStatus] = useState<Session["status"]>("loading");
	const [user, setUserState] = useState<UserAccount | null>(null);
	const [brand, setBrandState] = useState<BrandProfile | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		fetchMe(controller.signal)
			.then((me) => {
				setUserState(me.user);
				setBrandState(me.brand);
				setStatus("ready");
				if (!me.brand) router.replace("/bienvenida");
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				if (error instanceof ApiError && error.status === 401) {
					router.replace("/ingresar");
					return;
				}
				setStatus("unavailable");
			});
		return () => controller.abort();
	}, [router]);

	const setBrand = useCallback((next: BrandProfile) => setBrandState(next), []);
	const setUser = useCallback((next: UserAccount) => setUserState(next), []);

	return (
		<SessionContext value={{ status, user, brand, setBrand, setUser }}>{children}</SessionContext>
	);
}

export function useSession(): Session {
	const session = use(SessionContext);
	if (!session) throw new Error("useSession must be used inside SessionProvider");
	return session;
}
