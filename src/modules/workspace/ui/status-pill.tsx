import type { PieceStatus } from "../domain/workspace";
import { STATUS_LABEL, STATUS_STYLE } from "./workspace-labels";

/** Workflow status pill: colored dot on a soft tint. */
export function StatusPill({ status, size = "sm" }: { status: PieceStatus; size?: "sm" | "lg" }) {
	const style = STATUS_STYLE[status];
	const sizing = size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${style.soft} ${style.ink} ${sizing}`}
		>
			<span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
			{STATUS_LABEL[status]}
		</span>
	);
}
