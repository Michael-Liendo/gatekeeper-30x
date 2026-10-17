import type { EditorialSuggestions } from "../domain/review";

/** Edits proposed by the LLM for a gray-zone piece. */
export function SuggestionsCard({ suggestions }: { suggestions: EditorialSuggestions }) {
	return (
		<div className="grid gap-4 rounded-card border border-line bg-suggest p-4 text-ink">
			<div className="grid gap-1">
				<p className="text-xs font-semibold text-enrich-ink">Título sugerido</p>
				<p className="text-lg font-semibold leading-snug">{suggestions.suggestedTitle}</p>
			</div>
			{suggestions.summary.length > 0 ? (
				<div className="grid gap-1">
					<p className="text-xs font-semibold text-enrich-ink">Resumen</p>
					<ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
						{suggestions.summary.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</div>
			) : null}
			{suggestions.fixes.length > 0 ? (
				<div className="grid gap-1">
					<p className="text-xs font-semibold text-enrich-ink">Ajustes antes de publicar</p>
					<ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
						{suggestions.fixes.map((fix) => (
							<li key={fix}>{fix}</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
