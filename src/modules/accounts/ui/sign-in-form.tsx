"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/ui/fetch-json";
import { fetchMe, needsName, signIn } from "./auth-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const input =
	"min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base sm:text-sm";

/** Email-only sign-in; asks for the name the first time (400 + needsName). */
export function SignInForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [askName, setAskName] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const nameRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (askName) nameRef.current?.focus();
	}, [askName]);

	async function goNext(isNew: boolean) {
		if (isNew) {
			router.replace("/bienvenida");
			return;
		}
		try {
			const me = await fetchMe();
			router.replace(me.brand ? "/" : "/bienvenida");
		} catch {
			router.replace("/");
		}
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmedEmail = email.trim();
		if (!EMAIL.test(trimmedEmail)) {
			setError("Escribe un email válido, por ejemplo ana@tumarca.com.");
			return;
		}
		if (askName && name.trim() === "") {
			setError("Cuéntanos tu nombre para crear tu cuenta.");
			return;
		}
		setError(null);
		setPending(true);
		try {
			const result = await signIn(
				askName ? { email: trimmedEmail, name: name.trim() } : { email: trimmedEmail },
			);
			await goNext(result.isNew);
		} catch (cause) {
			setPending(false);
			if (cause instanceof ApiError && cause.status === 400 && needsName(cause.body)) {
				setAskName(true);
				return;
			}
			setError(cause instanceof Error ? cause.message : "No pudimos iniciar tu sesión.");
		}
	}

	return (
		<form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
			<div className="grid gap-1.5">
				<label htmlFor="email" className="text-sm font-medium">
					Tu email
				</label>
				<input
					id="email"
					type="email"
					autoComplete="email"
					inputMode="email"
					required
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
						if (askName) setAskName(false);
					}}
					placeholder="ana@tumarca.com"
					aria-invalid={error && !askName ? true : undefined}
					aria-describedby={error ? "sign-in-error" : undefined}
					className={input}
				/>
			</div>

			{askName ? (
				<div className="grid gap-1.5">
					<label htmlFor="name" className="text-sm font-medium">
						Tu nombre
					</label>
					<p id="name-hint" className="text-xs text-ink-muted">
						Es tu primera vez aquí. ¿Cómo te llamamos?
					</p>
					<input
						ref={nameRef}
						id="name"
						autoComplete="name"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Ana Pérez"
						aria-describedby={error ? "name-hint sign-in-error" : "name-hint"}
						className={input}
					/>
				</div>
			) : null}

			<div aria-live="polite" className="empty:hidden">
				{error ? (
					<p id="sign-in-error" className="text-sm text-danger">
						{error}
					</p>
				) : null}
			</div>

			<button
				type="submit"
				disabled={pending}
				aria-busy={pending}
				className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-ink hover:opacity-90 disabled:cursor-progress disabled:opacity-80"
			>
				{pending ? "Entrando…" : askName ? "Crear mi cuenta" : "Continuar"}
			</button>
		</form>
	);
}
