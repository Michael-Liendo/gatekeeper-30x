import type { Metadata } from "next";
import { CampaignView } from "@/modules/workspace/ui/campaign-view";

export const metadata: Metadata = { title: "Campaña" };

export default function CampaignPage() {
	return <CampaignView />;
}
