"use client";

import { useState } from "react";
import type { TeamRole } from "@/modules/workspace/domain/workspace";
import { useCurrentRole } from "@/modules/workspace/ui/use-author-role";
import { ROLE_LABEL, ROLES } from "@/modules/workspace/ui/workspace-labels";
import { useToast } from "@/shared/ui/toast";
import { updateRole } from "./auth-api";
import { useSession } from "./session-provider";

/** "¿Qué haces en el equipo?": Diseño, Copy, Editor u Otro (PATCH /api/me). */
export function RoleSelector() {
	const { user, setUser } = useSession();
	const current = useCurrentRole();
	const { notify } = useToast();
	const [pending, setPending] = useState<TeamRole | null>(null);
	const selected = pending ?? current ?? "other";

	async function choose(role: TeamRole) {
		if (role === selected || pending) return;
		setPending(role);
		try {
			const { user: saved } = await updateRole(role);
			setUser(saved);
			notify(`Listo: ahora apareces como ${ROLE_LABEL[role]}`);
		} catch (error) {
			notify(error instanceof Error ? error.message : "No pudimos guardar tu rol.");
		} finally {
			setPending(null);
		}
	}

	if (!user) return null;

	return (
		<fieldset className="grid max-w-3xl gap-3 rounded-card border border-line p-5 sm:p-6">
			<legend className="sr-only">¿Qué haces en el equipo?</legend>
			<div className="grid gap-1">
				<p aria-hidden="true" className="text-sm font-medium">
					¿Qué haces en el equipo?
				</p>
				<p className="text-xs text-ink-muted">Aparece junto a tu nombre en las piezas que subes.</p>
			</div>
			<div className="flex flex-wrap gap-2" aria-busy={pending !== null}>
				{ROLES.map((role) => {
					const active = role === selected;
					return (
						<button
							key={role}
							type="button"
							aria-pressed={active}
							disabled={pending !== null}
							onClick={() => void choose(role)}
							className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm transition-colors disabled:cursor-progress ${
								active
									? "bg-pill font-medium text-pill-ink"
									: "border border-line-strong text-ink-muted hover:text-ink"
							}`}
						>
							{ROLE_LABEL[role]}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
