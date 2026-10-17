"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { signOut } from "./auth-api";

/** POST /api/auth/sign-out, then back to /ingresar. */
export function SignOutButton({ className = "" }: { className?: string }) {
	const router = useRouter();
	const { notify } = useToast();
	const [pending, setPending] = useState(false);

	async function onClick() {
		setPending(true);
		try {
			await signOut();
			router.replace("/ingresar");
		} catch (error) {
			setPending(false);
			notify(error instanceof Error ? error.message : "No pudimos cerrar tu sesión.");
		}
	}

	return (
		<button
			type="button"
			onClick={() => void onClick()}
			disabled={pending}
			aria-busy={pending}
			className={`min-h-11 rounded-lg px-3 text-left text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-60 ${className}`}
		>
			{pending ? "Cerrando sesión…" : "Cerrar sesión"}
		</button>
	);
}
