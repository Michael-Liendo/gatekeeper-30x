import type { Metadata } from "next";
import { SignInForm } from "@/modules/accounts/ui/sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function SignInPage() {
	return (
		<div className="grid gap-6 pt-[8vh]">
			<section className="grid gap-6 rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
				<header className="grid gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Gatekeeper Editorial</h1>
					<p className="text-sm text-ink-muted">
						Publica lo bueno solo, ajusta lo dudoso con IA y revisa a mano únicamente lo que
						importa.
					</p>
				</header>
				<SignInForm />
			</section>
			<p className="px-2 text-center text-xs text-ink-muted">
				Demo del Hackathon 30X · sin contraseña: solo usamos tu email para guardar tu marca.
			</p>
		</div>
	);
}
