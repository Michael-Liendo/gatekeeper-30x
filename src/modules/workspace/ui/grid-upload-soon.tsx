import Link from "next/link";
import { secondaryButton } from "@/shared/ui/button-styles";
import { UploadIcon } from "@/shared/ui/icons";

/**
 * "Cargar grilla (Excel o CSV)": opens /campana/cargar. Kept under its original name
 * so existing imports (/nueva, /tablero) keep working.
 */
export function GridUploadSoon({ size = "md" }: { size?: "sm" | "md" }) {
	const sizing = size === "sm" ? "min-h-9 px-4 text-xs" : "";
	return (
		<Link href="/campana/cargar" className={`${secondaryButton} ${sizing}`}>
			<UploadIcon size={size === "sm" ? 16 : 18} />
			Cargar grilla (Excel o CSV)
		</Link>
	);
}
