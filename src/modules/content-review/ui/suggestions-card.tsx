import { SparkleIcon } from "@/shared/ui/icons";
import type { EditorialSuggestions } from "../domain/review";

/** Changes the AI proposes before publishing, on a soft lilac card. */
export function SuggestionsCard({ suggestions }: { suggestions: EditorialSuggestions }) {
	return (
		<section
			aria-label="Sugerencia de la IA"
			className="grid gap-4 rounded-card bg-linear-to-br from-lilac-from/60 to-lilac-to/60 p-5 text-ink"
		>
			<p className="flex items-center gap-2 text-sm font-medium">
				<SparkleIcon size={18} />
				Sugerencia de la IA
			</p>
			<div className="grid gap-1">
				<p className="text-xs text-ink/60">Título sugerido</p>
				<p className="text-lg leading-snug">{suggestions.suggestedTitle}</p>
			</div>
			{suggestions.fixes.length > 0 ? (
				<div className="grid gap-1.5">
					<p className="text-xs text-ink/60">Cambios antes de publicar</p>
					<ul className="grid gap-1.5 text-sm leading-relaxed">
						{suggestions.fixes.map((fix) => (
							<li key={fix} className="flex gap-2.5">
								<span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />
								{fix}
							</li>
						))}
					</ul>
				</div>
			) : null}
			{suggestions.summary.length > 0 ? (
				<details className="group">
					<summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-xs text-ink/70 underline underline-offset-2 [&::-webkit-details-marker]:hidden">
						Ver resumen
					</summary>
					<ul className="grid gap-1 text-sm leading-relaxed">
						{suggestions.summary.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</details>
			) : null}
		</section>
	);
}
