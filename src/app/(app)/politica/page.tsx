import type { Metadata } from "next";
import { PolicyView } from "@/modules/content-review/ui/policy-view";

export const metadata: Metadata = { title: "Política editorial" };

export default function PolicyPage() {
	return <PolicyView />;
}
