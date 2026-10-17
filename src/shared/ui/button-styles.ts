/**
 * Shared button and field classes (Soft UI, docs/07-estilo.md). Literal strings so
 * Tailwind sees them. `primaryButton` uses `bg-primary`: black by default, and the
 * brand color inside a subtree tinted with `brandStyle()` (onboarding).
 */

const shape =
	"inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,opacity,transform] active:scale-[0.98] disabled:active:scale-100";
const base = `${shape} min-h-11 px-6 text-sm`;

/** Black (or brand) pill with white ink: the one main action per screen. */
export const primaryButton = `${base} bg-primary text-primary-ink hover:opacity-85 disabled:cursor-progress disabled:opacity-60`;

/** Larger primary for hero forms (sign-in, onboarding). */
export const primaryButtonLarge = `${shape} min-h-14 px-8 text-base bg-primary text-primary-ink hover:opacity-85 disabled:cursor-progress disabled:opacity-60`;

/** White pill with a thin line border. */
export const secondaryButton = `${base} border border-line-strong bg-surface text-ink hover:bg-surface-muted disabled:opacity-50`;

/** Text-only, for low-emphasis actions next to a primary. */
export const ghostButton = `${shape} min-h-11 px-4 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50`;

/** Underlined text action ("Prefiero llenarlo a mano"). */
export const linkButton =
	"inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink";

/** Square black icon button (header search/actions). Pair with an aria-label. */
export const iconButton =
	"inline-grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-ink hover:opacity-85 disabled:opacity-60";

/** Minimal underline text input. */
export const underlineInput =
	"min-h-12 w-full border-0 border-b border-line-strong bg-transparent px-0 text-base text-ink placeholder:text-ink-muted/70 focus:border-ink focus:shadow-[0_1px_0_0_var(--ink)] focus:outline-none focus-visible:outline-none aria-invalid:border-danger";

/** Soft filled input used inside form cards. */
export const softInput =
	"min-h-11 w-full rounded-2xl border border-transparent bg-surface-muted px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/70 hover:border-line-strong focus:border-ink focus:bg-surface focus:outline-none sm:text-sm aria-invalid:border-danger aria-invalid:bg-danger-soft";
