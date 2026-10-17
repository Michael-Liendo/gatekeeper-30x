/** Lowercase, accent-free text for forgiving search ("politica" finds "Política"). */
export function normalize(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}
