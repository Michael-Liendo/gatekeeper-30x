import type { ReactNode } from "react";

/** Sign-in and onboarding: full-page, no sidebar. */
export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
			{/* Ambient background glow matching the inspiration aesthetic */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/15 via-purple-500/15 to-amber-500/10 blur-3xl"
			/>
			<main id="contenido-principal" className="w-full max-w-5xl">
				{children}
			</main>
		</div>
	);
}
