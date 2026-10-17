import { readableInk } from "@/shared/ui/contrast";

interface BrandMarkProps {
	name: string;
	color: string;
	logoUrl?: string;
	size?: "sm" | "lg";
}

/** Brand logo, or the brand's initial on its primary color when there is no logo. */
export function BrandMark({ name, color, logoUrl, size = "sm" }: BrandMarkProps) {
	const box = size === "lg" ? "size-14 rounded-xl text-2xl" : "size-9 rounded-lg text-base";
	if (logoUrl) {
		return (
			// Logos come from arbitrary brand domains, so next/image remote patterns can't list them.
			// biome-ignore lint/performance/noImgElement: external, user-provided logo URL
			<img
				src={logoUrl}
				alt={`Logo de ${name}`}
				className={`${box} shrink-0 border border-line bg-surface object-contain p-1`}
			/>
		);
	}
	const initial = name.trim().charAt(0).toUpperCase() || "?";
	return (
		<span
			aria-hidden="true"
			className={`${box} grid shrink-0 place-items-center font-semibold`}
			style={{ backgroundColor: color, color: readableInk(color) }}
		>
			{initial}
		</span>
	);
}
