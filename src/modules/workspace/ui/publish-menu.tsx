"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { primaryButton } from "@/shared/ui/button-styles";
import { ComingSoonPill } from "@/shared/ui/coming-soon-pill";
import { CopyActions } from "@/shared/ui/copy-actions";

/** Generic line marks (not official logos) for each network. */
function NetworkMark({ children }: { children: ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted"
		>
			<svg
				width={20}
				height={20}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				focusable="false"
			>
				{children}
			</svg>
		</span>
	);
}

const NETWORKS: readonly { name: string; mark: ReactNode }[] = [
	{
		name: "Instagram",
		mark: (
			<>
				<rect x="4" y="4" width="16" height="16" rx="5" />
				<circle cx="12" cy="12" r="3.5" />
				<circle cx="16.75" cy="7.25" r="0.6" fill="currentColor" />
			</>
		),
	},
	{
		name: "LinkedIn",
		mark: (
			<>
				<rect x="4" y="4" width="16" height="16" rx="3" />
				<path d="M8.5 11v5M8.5 8v.01M12 16v-5M12 13.5a2.5 2.5 0 0 1 5 0V16" />
			</>
		),
	},
	{
		name: "Facebook",
		mark: (
			<>
				<circle cx="12" cy="12" r="8" />
				<path d="M13.5 20v-7.5H16M13.5 12.5V10a2 2 0 0 1 2-2H16M11 12.5h2.5" />
			</>
		),
	},
	{
		name: "X",
		mark: (
			<>
				<rect x="4" y="4" width="16" height="16" rx="4" />
				<path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
			</>
		),
	},
	{
		name: "TikTok",
		mark: (
			<>
				<circle cx="9" cy="16" r="3" />
				<path d="M12 16V4.5c.5 2.5 2.5 4 5 4" />
			</>
		),
	},
];

interface PublishMenuProps {
	/** Publishing is only offered for approved pieces. */
	enabled: boolean;
	/** Shown next to the disabled button, e.g. "Apruébala primero". */
	disabledHint?: string;
	/** What the copy buttons inside copy or download. */
	text: string;
	imageSrc?: string | null;
	fileName?: string;
}

/**
 * "Publicar": opens a small panel with the networks we'll connect (coming soon) and,
 * meanwhile, the buttons to copy the copy and the image. Escape and clicking outside
 * close it and focus returns to the button.
 */
export function PublishMenu({
	enabled,
	disabledHint = "Apruébala primero",
	text,
	imageSrc,
	fileName,
}: PublishMenuProps) {
	const id = useId();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		panelRef.current?.focus();
		/** Pointer or focus landing outside the menu closes it. */
		function onPointerDown(event: Event) {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setOpen(false);
			buttonRef.current?.focus();
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("focusin", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("focusin", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative flex flex-wrap items-center gap-x-3 gap-y-1">
			<button
				ref={buttonRef}
				type="button"
				disabled={!enabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? `${id}-panel` : undefined}
				aria-describedby={enabled ? undefined : `${id}-hint`}
				onClick={() => setOpen((value) => !value)}
				className={`${primaryButton} disabled:cursor-not-allowed`}
			>
				<svg
					width={18}
					height={18}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M20 4 10.5 13.5M20 4l-6 16-3.5-6.5L4 10z" />
				</svg>
				Publicar
			</button>
			{enabled ? null : (
				<span id={`${id}-hint`} className="text-xs text-ink-muted">
					{disabledHint}
				</span>
			)}
			{open ? (
				<div
					ref={panelRef}
					id={`${id}-panel`}
					role="dialog"
					aria-labelledby={`${id}-title`}
					tabIndex={-1}
					className="absolute top-full left-0 z-30 mt-2 grid w-[min(21rem,calc(100vw-2rem))] gap-4 rounded-card border border-line bg-surface p-4 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)] focus:outline-none"
				>
					<div className="grid gap-1">
						<h3 id={`${id}-title`} className="text-base font-medium">
							Publicar en tus redes
						</h3>
						<p className="text-xs text-ink-muted">
							Muy pronto podrás publicar directo desde Gatekeeper.
						</p>
					</div>
					<ul className="grid gap-1.5">
						{NETWORKS.map((network) => (
							<li
								key={network.name}
								aria-disabled="true"
								className="flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm text-ink-muted"
							>
								<NetworkMark>{network.mark}</NetworkMark>
								<span className="flex-1">{network.name}</span>
								<ComingSoonPill />
							</li>
						))}
					</ul>
					<div className="grid gap-2 border-t border-line pt-3">
						<p className="text-sm font-medium">Mientras tanto: copia el copy y la imagen</p>
						<CopyActions text={text} imageSrc={imageSrc} fileName={fileName} />
					</div>
				</div>
			) : null}
		</div>
	);
}
