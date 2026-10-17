import type { Metadata } from "next";
import { NewPieceView } from "@/modules/content-review/ui/new-piece-view";

export const metadata: Metadata = { title: "Nueva pieza" };

export default function NewPiecePage() {
	return <NewPieceView />;
}
