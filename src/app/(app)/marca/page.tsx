import type { Metadata } from "next";
import { BrandSettingsView } from "@/modules/brand/ui/brand-settings-view";
import { PageHeader } from "@/modules/content-review/ui/page-header";

export const metadata: Metadata = { title: "Mi marca" };

export default function BrandPage() {
	return (
		<>
			<PageHeader
				title="Mi marca"
				description="El gatekeeper juzga cada pieza con este perfil: qué vendes, de qué hablas, tu tono y lo que nunca publicas."
			/>
			<BrandSettingsView />
		</>
	);
}
