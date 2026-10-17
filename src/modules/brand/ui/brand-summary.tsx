import { readableInk } from "@/shared/ui/contrast";
import type { BrandProfileInput } from "../domain/brand-profile";
import { primaryColor } from "./brand-input";
import { BrandMark } from "./brand-mark";

/** Celebratory card in the brand's primary color, plus what the gatekeeper will use. */
export function BrandSummary({ brand }: { brand: BrandProfileInput }) {
	const primary = primaryColor(brand);
	const ink = readableInk(primary);

	return (
		<div className="grid gap-4">
			<div
				className="relative isolate grid gap-8 overflow-hidden rounded-[var(--radius-card)] p-6 sm:p-9"
				style={{ backgroundColor: primary, color: ink }}
			>
				<span
					aria-hidden="true"
					className="-top-20 -right-20 absolute -z-10 size-64 rounded-full opacity-15"
					style={{ backgroundColor: ink }}
				/>
				<span
					aria-hidden="true"
					className="-right-6 -bottom-24 absolute -z-10 size-40 rounded-full opacity-10"
					style={{ backgroundColor: ink }}
				/>
				<div className="flex items-center gap-4">
					{/* Inverted mark (ink on the brand card) so it stands out from the background. */}
					<BrandMark name={brand.name} color={ink} logoUrl={brand.logoUrl} size="lg" />
					<div className="min-w-0">
						<p className="truncate text-2xl font-normal tracking-tight sm:text-3xl">{brand.name}</p>
						{brand.description ? (
							<p className="line-clamp-2 text-sm opacity-75">{brand.description}</p>
						) : null}
					</div>
				</div>
				<div className="grid gap-3">
					<p className="text-3xl leading-tight font-light tracking-tight sm:text-4xl">
						Lista para revisar tu contenido
					</p>
					<ul className="flex gap-2" aria-label="Colores de tu marca">
						{brand.colors.map((color, index) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: colors are positional
								key={index}
								className="size-8 rounded-full border-2"
								style={{ backgroundColor: color, borderColor: ink }}
							>
								<span className="sr-only">{color}</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			<dl className="grid gap-3 sm:grid-cols-2">
				<div className="grid gap-1 rounded-[var(--radius-card)] border border-line p-5">
					<dt className="text-xs text-ink-muted">Qué vendes</dt>
					<dd className="text-sm text-ink">{brand.offerings.join(", ")}</dd>
				</div>
				<div className="grid gap-1 rounded-[var(--radius-card)] border border-line p-5">
					<dt className="text-xs text-ink-muted">Para quién</dt>
					<dd className="text-sm text-ink">{brand.audience || "Todo público"}</dd>
				</div>
				{brand.tone ? (
					<div className="grid gap-1 rounded-[var(--radius-card)] border border-line p-5 sm:col-span-2">
						<dt className="text-xs text-ink-muted">Cómo habla</dt>
						<dd className="text-sm text-ink">{brand.tone}</dd>
					</div>
				) : null}
			</dl>
		</div>
	);
}
