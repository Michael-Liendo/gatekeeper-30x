import type { Metadata } from "next";
import { MyPiecesView } from "@/modules/workspace/ui/my-pieces-view";

export const metadata: Metadata = { title: "Mis piezas" };

export default function MyPiecesPage() {
	return <MyPiecesView />;
}
