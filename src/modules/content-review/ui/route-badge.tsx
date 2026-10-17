import type { Route } from "../domain/editorial-policy";
import { ROUTE_LABEL, ROUTE_STYLE } from "./labels";

interface RouteBadgeProps {
	route: Route;
	size?: "sm" | "lg";
}

/** Route pill: colored dot on a tinted background. */
export function RouteBadge({ route, size = "sm" }: RouteBadgeProps) {
	const style = ROUTE_STYLE[route];
	const sizing = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
	return (
		<span
			className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${style.soft} ${style.ink} ${sizing}`}
		>
			<span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
			{ROUTE_LABEL[route]}
		</span>
	);
}
