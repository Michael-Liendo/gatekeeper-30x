"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { SignOutButton } from "@/modules/accounts/ui/sign-out-button";
import { primaryColor } from "@/modules/brand/ui/brand-input";
import { BrandMark } from "@/modules/brand/ui/brand-mark";
import { brandStyle } from "@/modules/brand/ui/brand-style";
import { AnalyzeButton } from "./analyze-button";
import { formatSeconds } from "./format";
import { useReview } from "./review-session-provider";

interface NavItem {
	href: "/" | "/contenido" | "/nueva" | "/politica" | "/metricas" | "/marca";
	label: string;
	badge?: "pending";
}

const NAV: readonly NavItem[] = [
	{ href: "/", label: "Bandeja", badge: "pending" },
	{ href: "/contenido", label: "Todo el contenido" },
	{ href: "/nueva", label: "Nueva pieza" },
	{ href: "/politica", label: "Política editorial" },
	{ href: "/metricas", label: "Métricas" },
	{ href: "/marca", label: "Mi marca" },
];

function NavLinks({ pendingCount, pathname }: { pendingCount: number; pathname: string | null }) {
	return (
		<>
			{NAV.map((item) => {
				const active = pathname === item.href;
				return (
					<li key={item.href} className="shrink-0">
						<Link
							href={item.href}
							aria-current={active ? "page" : undefined}
							className="flex min-h-11 items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink aria-[current=page]:bg-brand aria-[current=page]:text-brand-ink"
						>
							{item.label}
							{item.badge === "pending" && pendingCount > 0 ? (
								<span className="rounded-full bg-human-soft px-2 py-0.5 font-mono text-xs font-semibold text-human-ink">
									<span className="sr-only">Pendientes: </span>
									{pendingCount}
								</span>
							) : null}
						</Link>
					</li>
				);
			})}
		</>
	);
}

/** Reads the pathname for the active link; isolated so it can suspend on its own. */
function ActiveNav({ pendingCount }: { pendingCount: number }) {
	const pathname = usePathname();
	return <NavLinks pendingCount={pendingCount} pathname={pathname} />;
}

function Nav({ pendingCount, className }: { pendingCount: number; className: string }) {
	return (
		<nav aria-label="Secciones" className="min-w-0">
			<ul className={className}>
				<Suspense fallback={<NavLinks pendingCount={pendingCount} pathname={null} />}>
					<ActiveNav pendingCount={pendingCount} />
				</Suspense>
			</ul>
		</nav>
	);
}

/** The signed-in brand (logo or initial on its color); product name until it loads. */
function Brand() {
	const { brand } = useSession();
	if (!brand) {
		return (
			<Link href="/" className="grid gap-0.5 rounded-md">
				<span className="font-semibold">Gatekeeper Editorial</span>
				<span className="text-xs text-ink-muted">30X Media</span>
			</Link>
		);
	}
	return (
		<Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md">
			<BrandMark name={brand.name} color={primaryColor(brand)} logoUrl={brand.logoUrl} />
			<span className="grid min-w-0 gap-0.5">
				<span className="truncate font-semibold">{brand.name}</span>
				<span className="text-xs text-ink-muted">Gatekeeper Editorial</span>
			</span>
		</Link>
	);
}

/** Who is signed in, plus sign-out. */
function Account() {
	const { user } = useSession();
	if (!user) return null;
	return (
		<div className="grid gap-1 border-t border-line pt-3">
			<p className="truncate px-3 text-xs text-ink-muted" title={user.email}>
				<span className="sr-only">Sesión iniciada como </span>
				{user.email}
			</p>
			<SignOutButton />
		</div>
	);
}

function RunStatusLine() {
	const { status, runMs, metrics, runError } = useReview();
	if (runError) {
		return (
			<p role="alert" className="text-xs text-danger">
				{runError}
			</p>
		);
	}
	if (status === "ready" && metrics) {
		return (
			<p className="text-xs text-ink-muted">
				{metrics.total} piezas analizadas
				{runMs !== null ? ` en ${formatSeconds(runMs)}` : ""}.
			</p>
		);
	}
	return null;
}

/** Phone variant of the account block: one slim row under the tabs. */
function MobileAccount() {
	const { user } = useSession();
	if (!user) return null;
	return (
		<div className="-mx-4 flex items-center justify-between gap-2 border-t border-line px-4">
			<p className="min-w-0 truncate text-xs text-ink-muted">
				<span className="sr-only">Sesión iniciada como </span>
				{user.email}
			</p>
			<SignOutButton className="shrink-0" />
		</div>
	);
}

/** App frame: sidebar on desktop, top bar with scrollable tabs on phones. */
export function AppShell({ children }: { children: ReactNode }) {
	const { pendingCount } = useReview();
	const { brand } = useSession();

	return (
		<div
			className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]"
			style={brand ? brandStyle(primaryColor(brand)) : undefined}
		>
			<a
				href="#contenido-principal"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
			>
				Saltar al contenido
			</a>

			{/* Desktop sidebar */}
			<aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface p-4 lg:flex">
				<Brand />
				<Nav pendingCount={pendingCount} className="grid gap-1" />
				<div className="mt-auto grid gap-2">
					<AnalyzeButton className="w-full" />
					<RunStatusLine />
					<Account />
				</div>
			</aside>

			{/* Phone / tablet top bar */}
			<header className="sticky top-0 z-30 grid grid-cols-1 gap-2 border-b border-line bg-surface px-4 pt-3 lg:hidden">
				<div className="flex items-center justify-between gap-3">
					<Brand />
					<AnalyzeButton />
				</div>
				<RunStatusLine />
				<Nav pendingCount={pendingCount} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2" />
				<MobileAccount />
			</header>

			<main id="contenido-principal" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
				{children}
			</main>
		</div>
	);
}
