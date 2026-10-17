import { z } from "zod";

const MAX_ITEMS = 20;
const MAX_ITEM_LENGTH = 120;

/** Trimmed list: blank items are dropped, then size limits apply. */
function textList(label: string) {
	return z
		.array(
			z
				.string()
				.trim()
				.max(
					MAX_ITEM_LENGTH,
					`Cada elemento de ${label} admite hasta ${MAX_ITEM_LENGTH} caracteres.`,
				),
		)
		.transform((items) => items.filter((item) => item.length > 0))
		.pipe(z.array(z.string()).max(MAX_ITEMS, `${label} admite hasta ${MAX_ITEMS} elementos.`))
		.default([]);
}

const httpUrl = z
	.string()
	.trim()
	.refine((value) => {
		try {
			const { protocol } = new URL(value);
			return protocol === "http:" || protocol === "https:";
		} catch {
			return false;
		}
	}, "Usa un enlace que empiece por http:// o https://.");

/** Body of PUT /api/brand. Mirrors `BrandProfileInput`. */
export const brandProfileInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Escribe el nombre de tu marca.")
		.max(80, "El nombre admite hasta 80 caracteres."),
	description: z
		.string()
		.trim()
		.max(1000, "La descripción admite hasta 1000 caracteres.")
		.default(""),
	audience: z.string().trim().max(300, "La audiencia admite hasta 300 caracteres.").default(""),
	offerings: textList("Productos y servicios"),
	tone: z.string().trim().max(500, "El tono admite hasta 500 caracteres.").default(""),
	topics: textList("Temas"),
	forbidden: textList("Temas prohibidos"),
	colors: z
		.array(
			z
				.string()
				.trim()
				.regex(/^#[0-9a-fA-F]{6}$/, "Usa colores en formato #RRGGBB."),
		)
		.max(6, "Puedes guardar hasta 6 colores.")
		.default([]),
	links: z.array(httpUrl).max(5, "Puedes guardar hasta 5 enlaces.").default([]),
	logoUrl: z.preprocess((v) => (v === "" || v === null ? undefined : v), httpUrl.optional()),
});

export type BrandProfileInputParsed = z.infer<typeof brandProfileInputSchema>;
