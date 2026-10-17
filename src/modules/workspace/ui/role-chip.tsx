import type { TeamRole } from "../domain/workspace";
import { ROLE_LABEL } from "./workspace-labels";

/** Small gray chip with the person's role in the team. */
export function RoleChip({ role }: { role: TeamRole }) {
	return (
		<span className="inline-flex items-center whitespace-nowrap rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted">
			{ROLE_LABEL[role]}
		</span>
	);
}
