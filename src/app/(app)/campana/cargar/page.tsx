import type { Metadata } from "next";
import { GridUploadView } from "@/modules/workspace/ui/grid-upload-view";

export const metadata: Metadata = { title: "Cargar grilla" };

export default function GridUploadPage() {
	return <GridUploadView />;
}
