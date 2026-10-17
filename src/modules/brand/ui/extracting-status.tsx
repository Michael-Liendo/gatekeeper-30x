"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
	"Leyendo tu sitio…",
	"Detectando colores…",
	"Entendiendo qué vendes…",
	"Identificando tu audiencia…",
	"Armando el perfil de tu marca…",
];

const ROTATE_MS = 2200;

/** Rotating progress copy while the brand extractor works. */
export function ExtractingStatus() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(
			() => setIndex((current) => Math.min(current + 1, MESSAGES.length - 1)),
			ROTATE_MS,
		);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div
			role="status"
			className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm"
		>
			<span
				aria-hidden="true"
				className="size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand"
			/>
			<span>{MESSAGES[index]}</span>
		</div>
	);
}
