"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, Suspense, useState } from "react";
import { signOut } from "@/modules/accounts/ui/auth-api";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { primaryColor } from "@/modules/brand/ui/brand-input";
import { BrandMark } from "@/modules/brand/ui/brand-mark";
import { readableInk } from "@/shared/ui/contrast";
import {
	BoardIcon,
	ChartIcon,
	GridIcon,
	InboxIcon,
	PlusIcon,
	SignOutIcon,
	SlidersIcon,
	StackIcon,
	TagIcon,
} from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { useReview } from "./review-session-provider";

type Href =
	| "/"
	| "/tablero"
	| "/mis-piezas"
	| "/contenido"
	| "/nueva"
	| "/politica"
	| "/metricas"
	| "/marca";

interface NavItem {
	href: Href;
	label: string;
	icon: (props: { size?: number }) => ReactNode;
	badge?: "pending";
}

const NAV: readonly NavItem[] = [
	{ href: "/", label: "Bandeja", icon: InboxIcon, badge: "pending" },
	{ href: "/tablero", label: "Tablero", icon: BoardIcon },
	{ href: "/mis-piezas", label: "Mis piezas", icon: StackIcon },
	{ href: "/contenido", label: "Contenido", icon: GridIcon },
	{ href: "/nueva", label: "Nueva pieza", icon: PlusIcon },
	{ href: "/politica", label: "Política", icon: SlidersIcon },
	{ href: "/metricas", label: "Métricas", icon: ChartIcon },
	{ href: "/marca", label: "Mi marca", icon: TagIcon },
];

/** Hover/focus label to the right of a rail icon (desktop only). */
function RailTooltip({ children }: { children: ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute top-1/2 left-full z-40 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-primary px-3 py-1.5 text-xs text-primary-ink group-focus-within:block group-hover:block"
		>
			{children}
		</span>
	);
}

function PendingBadge({ count }: { count: number }) {
	if (count <= 0) return null;
	return (
		<span
			aria-hidden="true"
			className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-human px-1 text-[0.6875rem] font-medium text-ink tabular-nums ring-2 ring-rail"
		>
			{count > 99 ? "99+" : count}
		</span>
	);
}

function NavIcons({
	pendingCount,
	pathname,
	layout,
}: {
	pendingCount: number;
	pathname: string | null;
	layout: "rail" | "bar";
}) {
	return (
		<>
			{NAV.map((item) => {
				const active = pathname === item.href;
				const Icon = item.icon;
				const pending = item.badge === "pending" ? pendingCount : 0;
				const accessible = pending > 0 ? `${item.label}, ${pending} pendientes` : item.label;
				return (
					<li key={item.href} className="group relative">
						<Link
							href={item.href}
							aria-current={active ? "page" : undefined}
							aria-label={accessible}
							className={`relative grid place-items-center rounded-2xl transition-colors ${
								layout === "rail" ? "size-11" : "size-10"
							} ${
								active
									? "bg-surface text-ink"
									: "text-rail-muted hover:bg-surface/10 hover:text-rail-ink"
							}`}
						>
							<Icon size={22} />
							<PendingBadge count={pending} />
						</Link>
						{layout === "rail" ? <RailTooltip>{item.label}</RailTooltip> : null}
					</li>
				);
			})}
		</>
	);
}

/** Reads the pathname for the active icon; isolated so it can suspend on its own. */
function ActiveNav({ pendingCount, layout }: { pendingCount: number; layout: "rail" | "bar" }) {
	const pathname = usePathname();
	return <NavIcons pendingCount={pendingCount} pathname={pathname} layout={layout} />;
}

function Nav({
	pendingCount,
	layout,
	className,
}: {
	pendingCount: number;
	layout: "rail" | "bar";
	className: string;
}) {
	return (
		<nav aria-label="Secciones">
			<ul className={className}>
				<Suspense
					fallback={<NavIcons pendingCount={pendingCount} pathname={null} layout={layout} />}
				>
					<ActiveNav pendingCount={pendingCount} layout={layout} />
				</Suspense>
			</ul>
		</nav>
	);
}

/** The signed-in brand's logo or initial; links home. */
function BrandLink({ withName = false }: { withName?: boolean }) {
	const { brand } = useSession();
	const name = brand?.name ?? "Gatekeeper";
	return (
		<Link
			href="/"
			aria-label={`${name}: ir a la bandeja`}
			className="flex min-w-0 items-center gap-2.5 rounded-xl"
		>
			{brand ? (
				<BrandMark name={brand.name} color={primaryColor(brand)} logoUrl={brand.logoUrl} />
			) : (
				<span
					aria-hidden="true"
					className="grid size-9 place-items-center rounded-lg bg-surface font-semibold text-ink"
				>
					G
				</span>
			)}
			{withName ? <span className="truncate text-sm font-medium">{name}</span> : null}
		</Link>
	);
}

/** Icon-only sign-out: POST /api/auth/sign-out, then back to /ingresar. */
function SignOutIconButton({ tone }: { tone: "rail" | "light" }) {
	const router = useRouter();
	const { notify } = useToast();
	const { user } = useSession();
	const [pending, setPending] = useState(false);

	async function onClick() {
		setPending(true);
		try {
			await signOut();
			router.replace("/ingresar");
		} catch (error) {
			setPending(false);
			notify(error instanceof Error ? error.message : "No pudimos cerrar tu sesión.");
		}
	}

	const label = pending
		? "Cerrando sesión…"
		: user
			? `Cerrar sesión (${user.email})`
			: "Cerrar sesión";

	return (
		<div className="group relative">
			<button
				type="button"
				onClick={() => void onClick()}
				disabled={pending}
				aria-busy={pending}
				aria-label={label}
				className={`grid size-11 place-items-center rounded-2xl transition-colors disabled:opacity-60 ${
					tone === "rail"
						? "text-rail-muted hover:bg-surface/10 hover:text-rail-ink"
						: "text-ink-muted hover:bg-surface hover:text-ink"
				}`}
			>
				<SignOutIcon size={22} />
			</button>
			{tone === "rail" ? <RailTooltip>{label}</RailTooltip> : null}
		</div>
	);
}

/** Visible error of the last sample review, shared by every screen. */
function RunNotice() {
	const { runError } = useReview();
	if (!runError) return null;
	return (
		<p role="alert" className="mb-6 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
			{runError}
		</p>
	);
}

/**
 * Brand color only as an accent (--brand); --primary stays black per the style guide,
 * so selected rows and main buttons keep the soft UI look.
 */
function accentStyle(color: string): CSSProperties {
	return { "--brand": color, "--brand-ink": readableInk(color) } as CSSProperties;
}

/** App frame: dark icon rail + white rounded canvas; bottom icon bar on phones. */
export function AppShell({ children }: { children: ReactNode }) {
	const { pendingCount } = useReview();
	const { brand } = useSession();

	return (
		<div
			className="min-h-dvh bg-ground lg:grid lg:grid-cols-[5rem_minmax(0,1fr)]"
			style={brand ? accentStyle(primaryColor(brand)) : undefined}
		>
			<a
				href="#contenido-principal"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2"
			>
				Saltar al contenido
			</a>

			{/* Desktop rail */}
			<aside className="sticky top-0 hidden h-dvh flex-col items-center gap-8 bg-rail py-6 text-rail-ink lg:flex">
				<BrandLink />
				<Nav pendingCount={pendingCount} layout="rail" className="grid gap-3" />
				<div className="mt-auto">
					<SignOutIconButton tone="rail" />
				</div>
			</aside>

			{/* Phone / tablet: slim top row */}
			<header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 lg:hidden">
				<BrandLink withName />
				<SignOutIconButton tone="light" />
			</header>

			<main
				id="contenido-principal"
				className="min-w-0 px-3 pt-3 pb-28 sm:px-4 sm:pt-4 sm:pb-32 lg:p-6 xl:p-8"
			>
				<div className="flex min-h-[calc(100dvh-3rem)] flex-col rounded-[28px] bg-surface px-4 py-6 sm:px-8 sm:py-8 lg:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)] lg:rounded-[var(--radius-panel)] lg:px-10 lg:py-8">
					<RunNotice />
					{children}
				</div>
			</main>

			{/* Phone / tablet: bottom icon bar */}
			<div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
				<Nav
					pendingCount={pendingCount}
					layout="bar"
					className="mx-auto flex max-w-md items-center justify-between rounded-[22px] bg-rail px-2 py-2"
				/>
			</div>
		</div>
	);
}
