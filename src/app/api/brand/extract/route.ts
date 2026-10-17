import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/modules/accounts/infrastructure/session";
import {
	BRAND_EXTRACTION_CONFIG,
	extractBrandDraft,
} from "@/modules/brand/infrastructure/brand-extractor";

const urlField = z
	.string()
	.trim()
	.min(1, "Escribe la dirección de tu sitio.")
	.max(2048, "La dirección es demasiado larga.");

const extractRequestSchema = z.union([
	z.object({ url: urlField }),
	z.object({
		urls: z
			.array(urlField)
			.min(1, "Agrega al menos un enlace de tu marca.")
			.max(
				BRAND_EXTRACTION_CONFIG.maxInputUrls,
				`Puedes analizar hasta ${BRAND_EXTRACTION_CONFIG.maxInputUrls} enlaces.`,
			),
	}),
]);

/** "Analizar mi marca": scrapes the brand's site(s) and returns a BrandProfileDraft. */
export async function POST(request: Request) {
	try {
		await requireUser();
	} catch (error) {
		if (error instanceof UnauthorizedError) {
			return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
		}
		throw error;
	}

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return Response.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
	}

	const parsed = extractRequestSchema.safeParse(json);
	if (!parsed.success) {
		const message = parsed.error.issues
			.flatMap((issue) => (issue.code === "invalid_union" ? issue.errors.flat() : [issue]))
			.find((issue) => issue.code !== "invalid_type")?.message;
		return Response.json(
			{ error: message ?? "Envía la dirección de tu sitio (url) o una lista de enlaces (urls)." },
			{ status: 400 },
		);
	}

	const urls = "url" in parsed.data ? [parsed.data.url] : parsed.data.urls;
	return Response.json(await extractBrandDraft(urls));
}
