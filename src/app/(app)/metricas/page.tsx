import type { Metadata } from "next";
import { MetricsView } from "@/modules/content-review/ui/metrics-view";

export const metadata: Metadata = { title: "Métricas" };

export default function MetricsPage() {
	return <MetricsView />;
}
