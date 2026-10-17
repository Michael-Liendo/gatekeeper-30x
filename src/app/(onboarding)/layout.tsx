import type { ReactNode } from "react";

/** Onboarding: full-page over the ground color, no rail. Pages own their layout. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
	return (
		<main id="contenido-principal" className="min-h-dvh bg-ground">
			{children}
		</main>
	);
}
