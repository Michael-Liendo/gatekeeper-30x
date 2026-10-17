import Image from "next/image";
import type { Route } from "../domain/editorial-policy";
import type { ReviewResult } from "../domain/review";
import { pieceImage } from "./labels";

/** Literal gradient classes per route so Tailwind sees them. */
const ROUTE_GRADIENT: Record<Route, string> = {
	AUTO_APPROVE: "from-aqua-from to-aqua-to",
	ENRICH_WITH_LLM: "from-lilac-from to-lilac-to",
	HUMAN_REVIEW: "from-peach-from to-peach-to",
	REJECT: "from-surface-muted to-line-strong",
};

/** Rounded thumbnail: the screenshot when there is one, otherwise the title's initial on a soft gradient. */
export function PieceThumb({ result, size = "md" }: { result: ReviewResult; size?: "md" | "lg" }) {
	const image = pieceImage(result.piece);
	const box = size === "lg" ? "size-14 rounded-[18px] text-xl" : "size-11 rounded-2xl text-base";
	if (image) {
		return (
			<Image
				src={image}
				alt=""
				width={112}
				height={112}
				unoptimized
				className={`${box} shrink-0 bg-surface-muted object-cover`}
			/>
		);
	}
	const initial = result.piece.title.trim().charAt(0).toUpperCase() || "·";
	return (
		<span
			aria-hidden="true"
			className={`${box} grid shrink-0 place-items-center bg-linear-to-br font-medium text-ink ${ROUTE_GRADIENT[result.route]}`}
		>
			{initial}
		</span>
	);
}
