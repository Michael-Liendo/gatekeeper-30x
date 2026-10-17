import type { Metadata } from "next";
import { BoardView } from "@/modules/workspace/ui/board-view";

export const metadata: Metadata = { title: "Tablero" };

export default function BoardPage() {
	return <BoardView />;
}
