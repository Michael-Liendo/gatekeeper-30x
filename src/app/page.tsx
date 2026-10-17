import type { Metadata } from "next";
import { InboxView } from "@/modules/content-review/ui/inbox-view";

export const metadata: Metadata = { title: "Bandeja" };

export default function InboxPage() {
	return <InboxView />;
}
