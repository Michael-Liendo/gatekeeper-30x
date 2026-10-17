import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/modules/content-review/ui/loading-block";
import { PieceResultView } from "@/modules/content-review/ui/piece-result-view";

export const metadata: Metadata = { title: "Resultado" };

export default function PieceResultPage() {
	// The id comes from the URL, so the view renders at request time.
	return (
		<Suspense fallback={<LoadingBlock />}>
			<PieceResultView />
		</Suspense>
	);
}
