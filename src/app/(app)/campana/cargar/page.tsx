import type { Metadata } from "next";
import { CreateTabs } from "@/modules/content-review/ui/section-nav";
import { GridUploadView } from "@/modules/workspace/ui/grid-upload-view";

export const metadata: Metadata = { title: "Cargar grilla" };

export default function GridUploadPage() {
	return (
		<>
			<CreateTabs active="grilla" />
			<GridUploadView />
		</>
	);
}
