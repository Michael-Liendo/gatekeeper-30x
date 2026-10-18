"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/ui/fetch-json";
import { fetchMe, needsName, signIn } from "./auth-api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const input =
	"min-h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3.5 text-base sm:text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-focus focus:ring-2 focus:ring-focus/20 focus:outline-none";

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
			router.replace(me.brand ? "/tablero" : "/bienvenida");
		} catch {
			router.replace("/tablero");
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
				<label
					htmlFor="email"
					className="text-xs font-semibold tracking-wide uppercase text-ink-muted"
				>
					Correo electrónico
				</label>
				<div className="relative">
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted/80"
					>
						<svg
							aria-hidden="true"
							className="size-4"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2"
							stroke="currentColor"
						>
							<title>Icono de email</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
							/>
						</svg>
					</span>
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
						placeholder="ejemplo@30x.org"
						aria-invalid={error && !askName ? true : undefined}
						aria-describedby={error ? "sign-in-error" : undefined}
						className={input}
					/>
				</div>
			</div>

			{askName ? (
				<div className="grid gap-1.5">
					<label
						htmlFor="name"
						className="text-xs font-semibold tracking-wide uppercase text-ink-muted"
					>
						Tu nombre
					</label>
					<p id="name-hint" className="text-sm text-ink">
						Es tu primera vez aquí. ¿Cómo te llamamos?
					</p>
					<div className="relative">
						<span
							aria-hidden="true"
							className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted/80"
						>
							<svg
								aria-hidden="true"
								className="size-4"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="2"
								stroke="currentColor"
							>
								<title>Icono de usuario</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
								/>
							</svg>
						</span>
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
				</div>
			) : null}

			<div aria-live="polite" className="empty:hidden">
				{error ? (
					<p
						id="sign-in-error"
						className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
					>
						{error}
					</p>
				) : null}
			</div>

			<button
				type="submit"
				disabled={pending}
				aria-busy={pending}
				className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md active:scale-[0.99] disabled:cursor-progress disabled:opacity-75"
			>
				<span>{pending ? "Entrando…" : askName ? "Crear mi cuenta" : "Continuar"}</span>
				{!pending ? (
					<svg
						aria-hidden="true"
						className="size-4"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="2.5"
						stroke="currentColor"
					>
						<title>Flecha hacia adelante</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
						/>
					</svg>
				) : null}
			</button>
		</form>
	);
}
