import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/modules/content-review/ui/loading-block";
import { PiecePageSwitch } from "@/modules/workspace/ui/piece-page-switch";

export const metadata: Metadata = { title: "Pieza" };

export default function PiecePage() {
	// The id comes from the URL, so the view renders at request time.
	return (
		<Suspense fallback={<LoadingBlock />}>
			<PiecePageSwitch />
		</Suspense>
	);
}
