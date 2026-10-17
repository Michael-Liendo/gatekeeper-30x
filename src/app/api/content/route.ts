import { sampleContent } from "@/modules/content-review/infrastructure/sample-content";

/**
 * Simulated dataset for the demo. Keeps `expectedRoute` so the panel can show
 * "esperado vs. decidido". Static data, so it is prerendered at build time.
 */
export function GET() {
	return Response.json(sampleContent);
}
