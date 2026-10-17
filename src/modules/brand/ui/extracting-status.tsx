"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
	"Leyendo tu página web…",
	"Mirando tus colores…",
	"Entendiendo qué vendes…",
	"Pensando en tu público…",
	"Armando el perfil de tu marca…",
];

const ROTATE_MS = 2200;

/** Friendly loading card while we read the brand's pages: slow pastel wash + rotating copy. */
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
			className="relative isolate overflow-hidden rounded-[var(--radius-card)] px-6 py-7 sm:px-8 sm:py-9"
		>
			<span
				aria-hidden="true"
				className="-inset-1/2 absolute -z-10 bg-conic from-(--grad-lilac-from) via-(--grad-aqua-from) to-(--grad-lilac-from) blur-2xl motion-safe:animate-spin motion-safe:[animation-duration:9s]"
			/>
			<span aria-hidden="true" className="absolute inset-0 -z-10 bg-surface/35" />
			<div className="flex items-center gap-4">
				<span aria-hidden="true" className="flex gap-1.5">
					{[0, 1, 2].map((dot) => (
						<span
							key={dot}
							className="size-2 rounded-full bg-ink motion-safe:animate-pulse"
							style={{ animationDelay: `${dot * 200}ms` }}
						/>
					))}
				</span>
				<p key={index} className="text-lg font-light text-ink sm:text-xl">
					{MESSAGES[index]}
				</p>
			</div>
			<p className="mt-2 text-sm text-ink/60">Esto toma unos segundos.</p>
		</div>
	);
}
