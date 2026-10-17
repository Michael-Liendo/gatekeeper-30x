"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { MoreIcon } from "@/shared/ui/icons";
import type { PieceStatus } from "../domain/workspace";
import { STATUS_LABEL, STATUS_STYLE, STATUSES } from "./workspace-labels";

interface MoveMenuProps {
	current: PieceStatus;
	/** Used in the button's accessible name, e.g. the piece title. */
	itemLabel: string;
	onMove: (status: PieceStatus) => void;
	disabled?: boolean;
}

/** "Mover a…" menu: button + list of the other columns. Arrow keys, Escape and Tab work. */
export function MoveMenu({ current, itemLabel, onMove, disabled = false }: MoveMenuProps) {
	const id = useId();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const targets = STATUSES.filter((status) => status !== current);

	useEffect(() => {
		if (!open) return;
		menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
		function onPointerDown(event: PointerEvent) {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	function close(returnFocus: boolean) {
		setOpen(false);
		if (returnFocus) buttonRef.current?.focus();
	}

	function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
		const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
		const index = items.indexOf(document.activeElement as HTMLButtonElement);
		if (event.key === "Escape") {
			event.preventDefault();
			close(true);
		} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			items[(index + step + items.length) % items.length]?.focus();
		} else if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			items[event.key === "Home" ? 0 : items.length - 1]?.focus();
		} else if (event.key === "Tab") {
			setOpen(false);
		}
	}

	return (
		<div ref={rootRef} className="relative">
			<button
				ref={buttonRef}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? `${id}-menu` : undefined}
				aria-label={`Mover «${itemLabel}» a otra columna`}
				disabled={disabled}
				onClick={() => setOpen((value) => !value)}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown" && !open) {
						event.preventDefault();
						setOpen(true);
					}
				}}
				className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50"
			>
				<MoreIcon size={20} />
			</button>
			{open ? (
				<div
					ref={menuRef}
					id={`${id}-menu`}
					role="menu"
					aria-label="Mover a…"
					onKeyDown={onMenuKey}
					className="absolute top-full right-0 z-20 mt-1 grid min-w-48 gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]"
				>
					<p aria-hidden="true" className="px-3 pt-1.5 pb-1 text-xs text-ink-muted">
						Mover a…
					</p>
					{targets.map((status) => (
						<button
							key={status}
							type="button"
							role="menuitem"
							tabIndex={-1}
							onClick={() => {
								close(true);
								onMove(status);
							}}
							className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted"
						>
							<span
								aria-hidden="true"
								className={`size-2 rounded-full ${STATUS_STYLE[status].dot}`}
							/>
							{STATUS_LABEL[status]}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
