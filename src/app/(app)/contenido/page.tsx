import type { Metadata } from "next";
import { ContentView } from "@/modules/content-review/ui/content-view";

export const metadata: Metadata = { title: "Contenido" };

export default function ContentPage() {
	return <ContentView />;
}
