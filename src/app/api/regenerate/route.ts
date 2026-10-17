import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/modules/accounts/infrastructure/session";
import type { BrandProfile } from "@/modules/brand/domain/brand-profile";
import { getCurrentBrand, getDefaultBrand } from "@/modules/brand/infrastructure/current-brand";
import {
	type RegenerateDeps,
	RegenerationFailedError,
	RegenerationNotConfiguredError,
	regeneratePiece,
} from "@/modules/content-review/application/regenerate-piece";
import { withSampleImage } from "@/modules/content-review/application/review-batch";
import {
	hasImageIssue,
	INVALID_IMAGE_MESSAGE,
	regenerateRequestSchema,
} from "@/modules/content-review/application/review-schemas";
import { toImageDataUrl } from "@/modules/content-review/domain/content-image";
import type { ContentPiece } from "@/modules/content-review/domain/content-piece";
import type { ReviewResult } from "@/modules/content-review/domain/review";
import { regenerateImage } from "@/modules/content-review/infrastructure/openai-image";
import { rewritePiece } from "@/modules/content-review/infrastructure/openai-llm";
import { getReviewDeps } from "@/modules/content-review/infrastructure/review-deps";
import {
	type Actor,
	getPieceDetail,
	getPieceImage,
	PieceNotFoundError,
} from "@/modules/workspace/application/piece-workflow";
import type { RegenerationProposal, WorkspacePiece } from "@/modules/workspace/domain/workspace";
import { getWorkspaceDeps } from "@/modules/workspace/infrastructure/workspace-deps";
import { env } from "@/shared/config/env";

/** Text rewrite + image edit (~60 s) + two JEV reviews. */
export const maxDuration = 120;

const NOT_CONFIGURED = "La regeneración con IA no está configurada.";
const FAILED = "No pudimos regenerar la pieza. Intenta de nuevo.";

/**
 * "Regenerar con IA": rewrites a piece (and redraws its screenshot) so it passes the
 * brand's editorial line, then JEV reviews the new version. Saves nothing.
 * Sample pieces (`cp-*`) use the 30X brand; the user's pieces and pasted pieces use theirs.
 */
export async function POST(request: Request) {
	let user: Awaited<ReturnType<typeof requireUser>>;
	try {
		user = await requireUser();
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return Response.json({ error: error.message }, { status: 401 });
		}
		throw error;
	}

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = regenerateRequestSchema.safeParse(json);
	if (!parsed.success) {
		return Response.json(
			{
				error: hasImageIssue(parsed.error)
					? INVALID_IMAGE_MESSAGE
					: "Petición inválida: envía el id de una pieza o la pieza completa.",
				issues: z.treeifyError(parsed.error),
			},
			{ status: 400 },
		);
	}

	if (!env.OPENAI_API_KEY) {
		return Response.json({ error: NOT_CONFIGURED }, { status: 503 });
	}
	const deps: RegenerateDeps = {
		...getReviewDeps(),
		rewrite: rewritePiece,
		regenerateImage,
	};

	const input = parsed.data;
	let piece: ContentPiece;
	let brand: BrandProfile;
	let previousReview: ReviewResult | undefined;
	if ("pieceId" in input) {
		if (input.pieceId.startsWith("cp-")) {
			const reviewDeps = getReviewDeps();
			const sample = reviewDeps.content.find((p) => p.id === input.pieceId);
			if (!sample) {
				return Response.json({ error: "No encontramos esa pieza." }, { status: 404 });
			}
			// Include the sample's image so it is reviewed and redrawn like a screenshot.
			piece = await withSampleImage(sample, reviewDeps.loadImage);
			brand = getDefaultBrand();
		} else {
			const stored = loadUserPiece(user, input.pieceId);
			if (!stored) {
				return Response.json({ error: "No encontramos esa pieza." }, { status: 404 });
			}
			piece = stored.piece;
			previousReview = stored.review;
			brand = (await getCurrentBrand()) ?? getDefaultBrand();
		}
	} else {
		brand = (await getCurrentBrand()) ?? getDefaultBrand();
		const now = new Date();
		piece = {
			id: `custom-${now.getTime()}`,
			...input,
			author: "Prueba en vivo",
			createdAt: now.toISOString(),
		};
	}

	try {
		const proposal: RegenerationProposal = await regeneratePiece(
			{ piece, brand, previousReview },
			deps,
		);
		return Response.json(proposal);
	} catch (error) {
		if (error instanceof RegenerationNotConfiguredError) {
			return Response.json({ error: NOT_CONFIGURED }, { status: 503 });
		}
		if (error instanceof RegenerationFailedError) {
			return Response.json({ error: FAILED }, { status: 502 });
		}
		console.warn(
			`[regenerate] failed for ${piece.id}: ${error instanceof Error ? error.message : "unknown error"}`,
		);
		return Response.json({ error: FAILED }, { status: 502 });
	}
}

/** One of the user's stored pieces as a ContentPiece (with its screenshot) plus its latest review. */
function loadUserPiece(
	user: Actor,
	pieceId: string,
): { piece: ContentPiece; review: ReviewResult } | null {
	const deps = getWorkspaceDeps();
	let stored: WorkspacePiece;
	let image: ReturnType<typeof getPieceImage>;
	try {
		stored = getPieceDetail(pieceId, user, deps).piece;
		image = getPieceImage(pieceId, user, deps);
	} catch (error) {
		if (error instanceof PieceNotFoundError) return null;
		throw error;
	}
	const piece: ContentPiece = {
		id: stored.id,
		title: stored.title,
		body: stored.body,
		format: stored.format,
		channel: stored.channel,
		// Neutral author: the reviewer never needs the person's name.
		author: "Equipo creativo",
		createdAt: stored.createdAt,
	};
	if (image) {
		piece.imageDataUrl = toImageDataUrl({
			mimeType: image.mimeType,
			base64: Buffer.from(image.bytes).toString("base64"),
		});
	}
	return { piece, review: stored.review };
}
