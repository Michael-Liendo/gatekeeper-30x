import type { Metadata } from "next";
import { NewPieceView } from "@/modules/content-review/ui/new-piece-view";
import { CreateTabs } from "@/modules/content-review/ui/section-nav";

export const metadata: Metadata = { title: "Nueva pieza" };

export default function NewPiecePage() {
	return (
		<>
			<CreateTabs active="subir" />
			<NewPieceView />
		</>
	);
}
