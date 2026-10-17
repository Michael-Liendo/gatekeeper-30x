import type { Metadata } from "next";
import { SegmentsView } from "@/modules/segmentation/ui/segments-view";

export const metadata: Metadata = { title: "Inscritos" };

export default function SegmentsPage() {
	return <SegmentsView />;
}
