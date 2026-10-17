"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { primaryButton, primaryButtonLarge, secondaryButton } from "@/shared/ui/button-styles";
import { EmptyState } from "./empty-state";
import { ROUTE_HINT, ROUTE_LABEL, ROUTE_STYLE } from "./labels";
import { LoadingBlock } from "./loading-block";
import { PageHeader } from "./page-header";
import { PieceDetail } from "./piece-detail";
import { useReview } from "./review-session-provider";

/** Result page for one piece: what was decided, why, and what to do next. */
export function PieceResultView() {
	const params = useParams<{ id: string }>();
	const id = decodeURIComponent(params.id);
	const { hydrated, results } = useReview();

	if (!hydrated) return <LoadingBlock />;

	// Read from the shared state so it follows policy changes and editor actions.
	const result = results.find((r) => r.piece.id === id);
	if (!result) {
		return (
			<EmptyState
				title="No encontramos esta pieza"
				action={
					<Link href="/nueva" className={primaryButton}>
						Subir una pieza
					</Link>
				}
			>
				Puede que la hayas revisado en otro navegador o que se haya borrado tu sesión.
			</EmptyState>
		);
	}

	const style = ROUTE_STYLE[result.route];
	const needsEditor = result.route === "HUMAN_REVIEW" || result.route === "ENRICH_WITH_LLM";

	return (
		<>
			<PageHeader
				title="Resultado de tu pieza"
				description={
					needsEditor
						? "También quedó en tu bandeja. Puedes decidirla aquí mismo o más tarde."
						: "Se resolvió sola. También la verás en Contenido."
				}
				actions={
					<>
						<Link href={needsEditor ? "/" : "/contenido"} className={secondaryButton}>
							{needsEditor ? "Ir a la bandeja" : "Ver todo el contenido"}
						</Link>
						<Link href="/nueva" className={primaryButton}>
							Subir otro post
						</Link>
					</>
				}
			/>

			<div className="mx-auto grid w-full max-w-3xl gap-6">
				<section
					aria-label="Decisión"
					className={`flex flex-wrap items-center gap-4 rounded-card ${style.soft} px-6 py-5`}
				>
					<span aria-hidden="true" className={`size-3 rounded-full ${style.dot}`} />
					<div className="grid gap-0.5">
						<p className={`text-xl font-medium ${style.ink}`}>{ROUTE_LABEL[result.route]}</p>
						<p className="text-sm text-ink-muted">{ROUTE_HINT[result.route]}</p>
					</div>
				</section>

				<div className="rounded-card border border-line p-5 sm:p-8">
					<PieceDetail key={result.piece.id} result={result} />
				</div>

				<Link href="/nueva" className={`${primaryButtonLarge} justify-self-center`}>
					Subir otro post
				</Link>
			</div>
		</>
	);
}
