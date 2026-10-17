import type { ReactNode } from "react";

/** Sign-in and onboarding: full-page, no sidebar. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
			<main id="contenido-principal" className="w-full max-w-xl">
				{children}
			</main>
		</div>
	);
}
