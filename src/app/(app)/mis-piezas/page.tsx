import type { Metadata } from "next";
import { ContentTabs } from "@/modules/content-review/ui/section-nav";
import { MyPiecesView } from "@/modules/workspace/ui/my-pieces-view";

export const metadata: Metadata = { title: "Mis piezas" };

export default function MyPiecesPage() {
	return (
		<>
			<ContentTabs active="mis-piezas" />
			<MyPiecesView />
		</>
	);
}
