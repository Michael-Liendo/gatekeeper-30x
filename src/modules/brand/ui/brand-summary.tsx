import { readableInk } from "@/shared/ui/contrast";
import type { BrandProfileInput } from "../domain/brand-profile";
import { primaryColor } from "./brand-input";
import { BrandMark } from "./brand-mark";

/** Read-only card with the brand's identity and a live preview of brand-tinted UI. */
export function BrandSummary({ brand }: { brand: BrandProfileInput }) {
	const primary = primaryColor(brand);
	const ink = readableInk(primary);

	return (
		<div className="grid gap-5 rounded-card border border-line bg-surface p-4 sm:p-6">
			<div className="flex items-center gap-4">
				<BrandMark name={brand.name} color={primary} logoUrl={brand.logoUrl} size="lg" />
				<div className="min-w-0">
					<p className="truncate text-lg font-semibold">{brand.name}</p>
					{brand.description ? (
						<p className="line-clamp-2 text-sm text-ink-muted">{brand.description}</p>
					) : null}
				</div>
			</div>

			<div className="grid gap-1.5">
				<p className="text-xs font-medium text-ink-muted">Colores</p>
				<ul className="flex flex-wrap gap-2">
					{brand.colors.map((color, index) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: colors are positional
							key={index}
							className="flex items-center gap-1.5 rounded-full border border-line py-1 pr-3 pl-1"
						>
							<span
								aria-hidden="true"
								className="size-5 rounded-full border border-line"
								style={{ backgroundColor: color }}
							/>
							<span className="font-mono text-xs uppercase">{color}</span>
						</li>
					))}
				</ul>
			</div>

			<dl className="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-xs font-medium text-ink-muted">Qué vende</dt>
					<dd>{brand.offerings.join(", ")}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium text-ink-muted">Temas</dt>
					<dd>{brand.topics.join(", ")}</dd>
				</div>
			</dl>

			<div className="grid gap-2">
				<p className="text-xs font-medium text-ink-muted">Así se verá tu bandeja</p>
				<div
					className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ground p-3"
					aria-label="Vista previa con el color de tu marca"
					role="img"
				>
					<div className="grid min-w-0 gap-1">
						<span className="truncate text-sm font-medium">Post: lanzamiento de temporada</span>
						<span
							className="inline-flex items-center gap-1.5 justify-self-start rounded-full px-2.5 py-0.5 text-xs font-semibold"
							style={{ backgroundColor: primary, color: ink }}
						>
							<span
								aria-hidden="true"
								className="size-2 rounded-full"
								style={{ backgroundColor: ink }}
							/>
							Aprobado
						</span>
					</div>
					<span
						className="inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold"
						style={{ backgroundColor: primary, color: ink }}
					>
						Publicar
					</span>
				</div>
			</div>
		</div>
	);
}
