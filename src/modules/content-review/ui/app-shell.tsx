"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, Suspense, useState } from "react";
import { signOut } from "@/modules/accounts/ui/auth-api";
import { useSession } from "@/modules/accounts/ui/session-provider";
import { primaryColor } from "@/modules/brand/ui/brand-input";
import { BrandMark } from "@/modules/brand/ui/brand-mark";
import { UsersIcon } from "@/modules/segmentation/ui/segment-bits";
import { readableInk } from "@/shared/ui/contrast";
import {
	ChartIcon,
	GridIcon,
	InboxIcon,
	PlusIcon,
	SignOutIcon,
	SlidersIcon,
} from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { useReview } from "./review-session-provider";

type Href = "/" | "/tablero" | "/nueva" | "/segmentos" | "/metricas" | "/marca";

interface NavItem {
	href: Href;
	label: string;
	icon: (props: { size?: number }) => ReactNode;
	/** Route prefixes (besides href) that belong to this section. */
	matches: readonly string[];
	badge?: "pending";
	/** Rendered as the primary action (filled brand accent). */
	primary?: boolean;
}

/** Five sections; their sub-views live in in-page tabs (see section-nav.tsx). */
const NAV: readonly NavItem[] = [
	{ href: "/", label: "Bandeja", icon: InboxIcon, matches: [], badge: "pending" },
	{
		href: "/tablero",
		label: "Contenido",
		icon: GridIcon,
		matches: ["/campana", "/mis-piezas", "/contenido", "/pieza"],
	},
	{ href: "/nueva", label: "Crear", icon: PlusIcon, matches: ["/campana/cargar"], primary: true },
	{ href: "/segmentos", label: "Inscritos", icon: UsersIcon, matches: [] },
	{ href: "/metricas", label: "Resultados", icon: ChartIcon, matches: [] },
];

const SETTINGS = { href: "/marca", label: "Ajustes", matches: ["/politica"] } as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSettings(pathname: string | null): boolean {
	if (!pathname) return false;
	return [SETTINGS.href, ...SETTINGS.matches].some((prefix) => matchesPrefix(pathname, prefix));
}

/** The section that owns the pathname; the longest matching prefix wins (/campana/cargar → Crear). */
function activeSection(pathname: string | null): Href | null {
	if (!pathname) return null;
	if (pathname === "/") return "/";
	let best: { href: Href; length: number } | null = null;
	for (const item of NAV) {
		if (item.href === "/") continue;
		for (const prefix of [item.href, ...item.matches]) {
			if (matchesPrefix(pathname, prefix) && (!best || prefix.length > best.length)) {
				best = { href: item.href, length: prefix.length };
			}
		}
	}
	return best?.href ?? null;
}

/** Hover/focus label to the right of a rail control (desktop only). */
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
			className="absolute -top-1.5 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-human px-1 text-[0.6875rem] font-medium text-ink tabular-nums ring-2 ring-rail"
		>
			{count > 99 ? "99+" : count}
		</span>
	);
}

function chipClass(item: NavItem, active: boolean, layout: "rail" | "bar"): string {
	const size = layout === "rail" ? "h-9 w-12" : "h-8 w-11";
	if (item.primary) {
		return `${size} bg-brand text-brand-ink ring-1 ring-inset ring-rail-ink/30 ${
			active ? "outline-2 outline-offset-2 outline-rail-ink" : "group-hover/item:brightness-110"
		}`;
	}
	return `${size} ${
		active
			? "bg-surface text-ink"
			: "text-rail-muted group-hover/item:bg-surface/10 group-hover/item:text-rail-ink"
	}`;
}

function NavItems({
	pendingCount,
	pathname,
	layout,
}: {
	pendingCount: number;
	pathname: string | null;
	layout: "rail" | "bar";
}) {
	const current = activeSection(pathname);
	return (
		<>
			{NAV.map((item) => {
				const active = current === item.href;
				const Icon = item.icon;
				const pending = item.badge === "pending" ? pendingCount : 0;
				return (
					<li key={item.href} className={layout === "bar" ? "min-w-0 flex-1" : undefined}>
						<Link
							href={item.href}
							aria-current={active ? "page" : undefined}
							className={`group/item flex min-h-11 flex-col items-center gap-1 rounded-2xl transition-colors ${
								layout === "rail" ? "px-1 py-1.5" : "px-0 py-1"
							} ${active || item.primary ? "text-rail-ink" : "text-rail-muted hover:text-rail-ink"}`}
						>
							<span
								className={`relative grid place-items-center rounded-full transition-colors ${chipClass(item, active, layout)}`}
							>
								<Icon size={layout === "rail" ? 22 : 20} />
								<PendingBadge count={pending} />
							</span>
							<span
								className={`max-w-full truncate leading-tight ${
									layout === "rail" ? "text-xs" : "text-[0.6875rem]"
								} ${active ? "font-medium" : ""}`}
							>
								{item.label}
							</span>
							{pending > 0 ? <span className="sr-only">, {pending} pendientes</span> : null}
						</Link>
					</li>
				);
			})}
		</>
	);
}

/** Reads the pathname for the active section; isolated so it can suspend on its own. */
function ActiveNav({ pendingCount, layout }: { pendingCount: number; layout: "rail" | "bar" }) {
	const pathname = usePathname();
	return <NavItems pendingCount={pendingCount} pathname={pathname} layout={layout} />;
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
		<nav aria-label="Secciones" className={layout === "rail" ? "w-full" : undefined}>
			<ul className={className}>
				<Suspense
					fallback={<NavItems pendingCount={pendingCount} pathname={null} layout={layout} />}
				>
					<ActiveNav pendingCount={pendingCount} layout={layout} />
				</Suspense>
			</ul>
		</nav>
	);
}

/** Ajustes (Mi marca + Política): labeled on the rail, icon-only in the phone top row. */
function SettingsLinkView({ pathname, tone }: { pathname: string | null; tone: "rail" | "light" }) {
	const active = isSettings(pathname);
	if (tone === "light") {
		return (
			<Link
				href={SETTINGS.href}
				aria-current={active ? "page" : undefined}
				aria-label={SETTINGS.label}
				className={`grid size-11 place-items-center rounded-2xl transition-colors ${
					active ? "bg-surface text-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
				}`}
			>
				<SlidersIcon size={22} />
			</Link>
		);
	}
	return (
		<Link
			href={SETTINGS.href}
			aria-current={active ? "page" : undefined}
			className={`group/item flex min-h-11 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors ${
				active ? "text-rail-ink" : "text-rail-muted hover:text-rail-ink"
			}`}
		>
			<span
				className={`grid h-9 w-12 place-items-center rounded-full transition-colors ${
					active ? "bg-surface text-ink" : "group-hover/item:bg-surface/10"
				}`}
			>
				<SlidersIcon size={22} />
			</span>
			<span className={`text-xs leading-tight ${active ? "font-medium" : ""}`}>
				{SETTINGS.label}
			</span>
		</Link>
	);
}

function ActiveSettingsLink({ tone }: { tone: "rail" | "light" }) {
	const pathname = usePathname();
	return <SettingsLinkView pathname={pathname} tone={tone} />;
}

function SettingsLink({ tone }: { tone: "rail" | "light" }) {
	return (
		<Suspense fallback={<SettingsLinkView pathname={null} tone={tone} />}>
			<ActiveSettingsLink tone={tone} />
		</Suspense>
	);
}

/** The signed-in brand's logo or initial; links home. */
function BrandLink({ withName = false }: { withName?: boolean }) {
	const { brand } = useSession();
	const name = brand?.name ?? "Gatekeeper";
	return (
		<Link
			href="/tablero"
			aria-label={`${name}: ir a contenido`}
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

/** Sign-out (labeled on the rail, icon-only on phones): POST /api/auth/sign-out, then back to /ingresar. */
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

	if (tone === "rail") {
		return (
			<div className="group relative">
				<button
					type="button"
					onClick={() => void onClick()}
					disabled={pending}
					aria-busy={pending}
					aria-label={`Salir: ${label}`}
					className="group/item flex min-h-11 w-full flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-rail-muted transition-colors hover:text-rail-ink disabled:opacity-60"
				>
					<span className="grid h-9 w-12 place-items-center rounded-full transition-colors group-hover/item:bg-surface/10">
						<SignOutIcon size={22} />
					</span>
					<span aria-hidden="true" className="text-xs leading-tight">
						Salir
					</span>
				</button>
				<RailTooltip>{label}</RailTooltip>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={() => void onClick()}
			disabled={pending}
			aria-busy={pending}
			aria-label={label}
			className="grid size-11 place-items-center rounded-2xl text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-60"
		>
			<SignOutIcon size={22} />
		</button>
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

/** App frame: dark labeled rail + white rounded canvas; bottom labeled bar on phones. */
export function AppShell({ children }: { children: ReactNode }) {
	const { pendingCount } = useReview();
	const { brand } = useSession();

	return (
		<div
			className="min-h-dvh bg-ground lg:grid lg:grid-cols-[5.75rem_minmax(0,1fr)]"
			style={brand ? accentStyle(primaryColor(brand)) : undefined}
		>
			<a
				href="#contenido-principal"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2"
			>
				Saltar al contenido
			</a>

			{/* Desktop rail */}
			<aside className="sticky top-0 hidden h-dvh flex-col items-center gap-6 overflow-y-auto bg-rail px-2 py-6 text-rail-ink lg:flex">
				<BrandLink />
				<Nav pendingCount={pendingCount} layout="rail" className="grid gap-2" />
				<div className="mt-auto grid w-full gap-1">
					<SettingsLink tone="rail" />
					<SignOutIconButton tone="rail" />
				</div>
			</aside>

			{/* Phone / tablet: slim top row */}
			<header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 lg:hidden">
				<BrandLink withName />
				<div className="flex shrink-0 items-center gap-1">
					<SettingsLink tone="light" />
					<SignOutIconButton tone="light" />
				</div>
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

			{/* Phone / tablet: bottom bar with the five sections */}
			<div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
				<Nav
					pendingCount={pendingCount}
					layout="bar"
					className="mx-auto flex max-w-md items-stretch justify-between rounded-[22px] bg-rail px-1 py-1.5"
				/>
			</div>
		</div>
	);
}
