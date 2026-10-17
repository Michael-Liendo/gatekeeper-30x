import type { Route } from "../domain/editorial-policy";
import { ROUTE_LABEL, ROUTE_STYLE } from "./labels";

interface RouteBadgeProps {
	route: Route;
	size?: "sm" | "lg";
	/** For use on the black selected row. */
	inverted?: boolean;
}

/** Route pill: colored dot on a soft tint. */
export function RouteBadge({ route, size = "sm", inverted = false }: RouteBadgeProps) {
	const style = ROUTE_STYLE[route];
	const sizing = size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
	const colors = inverted ? "bg-surface/15 text-primary-ink" : `${style.soft} ${style.ink}`;
	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ${colors} ${sizing}`}
		>
			<span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
			{ROUTE_LABEL[route]}
		</span>
	);
}
