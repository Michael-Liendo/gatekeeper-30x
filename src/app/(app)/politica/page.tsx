import type { Metadata } from "next";
import { PolicyView } from "@/modules/content-review/ui/policy-view";
import { SettingsTabs } from "@/modules/content-review/ui/section-nav";

export const metadata: Metadata = { title: "Política" };

export default function PolicyPage() {
	return (
		<>
			<SettingsTabs active="politica" />
			<PolicyView />
		</>
	);
}
