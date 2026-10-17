import type { Metadata } from "next";
import { ContentTabs } from "@/modules/content-review/ui/section-nav";
import { BoardView } from "@/modules/workspace/ui/board-view";

export const metadata: Metadata = { title: "Tablero" };

export default function BoardPage() {
	return (
		<>
			<ContentTabs active="tablero" />
			<BoardView />
		</>
	);
}
