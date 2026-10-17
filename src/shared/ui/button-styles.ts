/** Literal button classes so Tailwind sees them; primary follows the brand color. */

export const primaryButton =
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-ink hover:opacity-90 disabled:cursor-progress disabled:opacity-70";

export const secondaryButton =
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-60";

export const linkButton =
	"inline-flex min-h-11 items-center rounded-md px-1 text-sm font-medium text-ink-muted underline underline-offset-2 hover:text-ink";
