/** Liveness probe for Coolify / Docker healthchecks. */
export function GET() {
	return Response.json({ status: "ok" });
}
