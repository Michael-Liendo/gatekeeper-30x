import Image from "next/image";
import type { WorkspacePiece } from "../domain/workspace";
import { STATUS_STYLE } from "./workspace-labels";

const SIZE = {
	md: "size-11 rounded-2xl text-base",
	lg: "size-14 rounded-[18px] text-xl",
	wide: "aspect-[16/9] w-full rounded-2xl text-2xl",
} as const;

/** The screenshot when there is one, otherwise the title's initial on a soft gradient. */
export function WorkspaceThumb({
	piece,
	size = "md",
}: {
	piece: Pick<WorkspacePiece, "title" | "imageUrl" | "status">;
	size?: keyof typeof SIZE;
}) {
	const box = SIZE[size];
	if (piece.imageUrl) {
		return (
			<Image
				src={piece.imageUrl}
				alt=""
				width={480}
				height={270}
				unoptimized
				className={`${box} shrink-0 bg-surface-muted object-cover`}
			/>
		);
	}
	const initial = piece.title.trim().charAt(0).toUpperCase() || "·";
	return (
		<span
			aria-hidden="true"
			className={`${box} grid shrink-0 place-items-center bg-linear-to-br font-medium text-ink ${STATUS_STYLE[piece.status].gradient}`}
		>
			{initial}
		</span>
	);
}
