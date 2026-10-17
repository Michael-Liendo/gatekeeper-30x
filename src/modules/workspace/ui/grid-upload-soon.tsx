"use client";

import { useId } from "react";
import { secondaryButton } from "@/shared/ui/button-styles";
import { ComingSoonPill } from "@/shared/ui/coming-soon-pill";
import { UploadIcon } from "@/shared/ui/icons";

const HINT = "Muy pronto podrás subir tu calendario de contenido completo";

/**
 * "Cargar grilla (Excel o CSV)", announced but not available yet. It stays focusable
 * (aria-disabled, not disabled) so keyboard and screen reader users get the tooltip.
 */
export function GridUploadSoon({ size = "md" }: { size?: "sm" | "md" }) {
	const hintId = useId();
	const sizing = size === "sm" ? "min-h-9 px-4 text-xs" : "";
	return (
		<span className="group relative inline-flex">
			<button
				type="button"
				aria-disabled="true"
				aria-describedby={hintId}
				onClick={(event) => event.preventDefault()}
				className={`${secondaryButton} ${sizing} cursor-not-allowed text-ink-muted hover:bg-surface active:scale-100`}
			>
				<UploadIcon size={size === "sm" ? 16 : 18} />
				Cargar grilla (Excel o CSV)
				<ComingSoonPill />
			</button>
			<span
				id={hintId}
				role="tooltip"
				className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 w-max max-w-64 -translate-x-1/2 rounded-xl bg-primary px-3 py-2 text-center text-xs text-primary-ink opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
			>
				{HINT}
			</span>
		</span>
	);
}
