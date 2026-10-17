import type { Metadata } from "next";
import { ContentView } from "@/modules/content-review/ui/content-view";
import { ContentTabs } from "@/modules/content-review/ui/section-nav";

export const metadata: Metadata = { title: "Contenido" };

export default function ContentPage() {
	return (
		<>
			<ContentTabs active="ejemplos" />
			<ContentView />
		</>
	);
}
