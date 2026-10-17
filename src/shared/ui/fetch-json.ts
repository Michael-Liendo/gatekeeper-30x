/** Client-side JSON fetch that turns `{ error }` responses into a typed error. */

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

const NETWORK_ERROR = "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.";

function errorMessage(body: unknown, status: number): string {
	if (typeof body === "object" && body !== null && "error" in body) {
		const { error } = body as { error: unknown };
		if (typeof error === "string" && error.length > 0) return error;
	}
	if (status === 401) return "Tu sesión expiró. Vuelve a ingresar.";
	if (status === 404) return "Esta función todavía no está disponible.";
	return "Algo salió mal. Intenta de nuevo en un momento.";
}

/** Sends JSON (when `body` is given) and parses the JSON reply; throws ApiError on non-2xx. */
export async function fetchJson<T>(
	url: string,
	init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
	let response: Response;
	try {
		response = await fetch(url, {
			method: init.method ?? (init.body === undefined ? "GET" : "POST"),
			headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
			signal: init.signal,
			cache: "no-store",
		});
	} catch (cause) {
		if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
		throw new ApiError(NETWORK_ERROR, 0, null);
	}
	const text = await response.text();
	let body: unknown = null;
	if (text) {
		try {
			body = JSON.parse(text);
		} catch {
			body = null;
		}
	}
	if (!response.ok) throw new ApiError(errorMessage(body, response.status), response.status, body);
	return body as T;
}
