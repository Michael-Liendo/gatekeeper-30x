import type { Metadata } from "next";
import { RoleSelector } from "@/modules/accounts/ui/role-selector";
import { BrandSettingsView } from "@/modules/brand/ui/brand-settings-view";
import { PageHeader } from "@/modules/content-review/ui/page-header";
import { SettingsTabs } from "@/modules/content-review/ui/section-nav";

export const metadata: Metadata = { title: "Mi marca" };

export default function BrandPage() {
	return (
		<>
			<SettingsTabs active="marca" />
			<PageHeader
				title="Mi marca"
				description="El gatekeeper juzga cada pieza con este perfil: qué vendes, de qué hablas, tu tono y lo que nunca publicas."
			/>
			<div className="grid gap-8">
				<RoleSelector />
				<BrandSettingsView />
			</div>
		</>
	);
}
