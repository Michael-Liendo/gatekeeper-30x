import type { Metadata } from "next";
import { ContentTabs } from "@/modules/content-review/ui/section-nav";
import { CampaignView } from "@/modules/workspace/ui/campaign-view";

export const metadata: Metadata = { title: "Campaña" };

export default function CampaignPage() {
	return (
		<>
			<ContentTabs active="calendario" />
			<CampaignView />
		</>
	);
}
