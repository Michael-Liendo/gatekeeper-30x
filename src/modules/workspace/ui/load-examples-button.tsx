"use client";

import { useState } from "react";
import { secondaryButton } from "@/shared/ui/button-styles";
import { useToast } from "@/shared/ui/toast";
import { loadExamples, messageOf } from "./workspace-api";

/** "Cargar piezas de ejemplo": loads the demo examples, then asks the view to reload. */
export function LoadExamplesButton({ onLoaded }: { onLoaded: () => void }) {
	const { notify } = useToast();
	const [loading, setLoading] = useState(false);

	async function load() {
		setLoading(true);
		try {
			const { created } = await loadExamples();
			notify(
				created > 0
					? `Cargamos ${created} piezas de ejemplo, revisadas con tu marca`
					: "Las piezas de ejemplo ya estaban cargadas",
			);
			onLoaded();
		} catch (error) {
			notify(messageOf(error));
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			type="button"
			onClick={() => void load()}
			disabled={loading}
			aria-busy={loading}
			className={secondaryButton}
		>
			{loading ? "Preparando piezas de ejemplo…" : "Cargar piezas de ejemplo"}
		</button>
	);
}
