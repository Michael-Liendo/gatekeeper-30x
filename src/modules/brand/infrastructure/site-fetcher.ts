import "server-only";
import dns from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";
import { pipeline, type Transform } from "node:stream";
import zlib from "node:zlib";
import { isPublicAddress } from "../domain/ip-ranges";

/**
 * SSRF-safe HTML fetcher for brand onboarding. The user types any URL, so every
 * hop is validated: http(s) only, default ports only, no credentials, and the
 * socket connects only to addresses that resolved to the public internet (the
 * check runs inside the connection's DNS lookup, so it can't be rebound later).
 */

export const SITE_FETCH_LIMITS = {
	timeoutMs: 8_000,
	maxBytes: 1.5 * 1024 * 1024,
	maxRedirects: 3,
} as const;

export const BOT_USER_AGENT = "GatekeeperBot/1.0 (+https://gatekeeper-30x.michaelliendo.com)";

/** Social networks only serve their public preview tags (og:*) to link-preview crawlers. */
export const PREVIEW_USER_AGENT =
	"facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const HTML_TYPES = ["text/html", "application/xhtml+xml"];

/** A failure the user can read (message in Spanish). */
export class SiteFetchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SiteFetchError";
	}
}

export interface FetchedPage {
	/** Final URL after redirects. */
	url: string;
	html: string;
}

/** Throws a SiteFetchError unless the URL is http(s), on a default port, without credentials. */
export function assertFetchableUrl(raw: string | URL): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new SiteFetchError("la dirección no es válida");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new SiteFetchError("solo se permiten direcciones http o https");
	}
	if (!ALLOWED_PORTS.has(url.port)) {
		throw new SiteFetchError("solo se permiten los puertos 80 y 443");
	}
	if (url.username || url.password) {
		throw new SiteFetchError("la dirección no puede incluir usuario ni contraseña");
	}
	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (isIP(host) && !isPublicAddress(host)) {
		throw new SiteFetchError("la dirección apunta a una red privada");
	}
	return url;
}

/** DNS lookup that refuses to hand the socket any non-public address. */
const safeLookup: LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
		if (error) {
			callback(error, "", 4);
			return;
		}
		if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
			callback(new SiteFetchError("la dirección apunta a una red privada"), "", 4);
			return;
		}
		if (options.all) {
			// Node's types model only the single-address callback; `all` wants the array.
			(callback as unknown as (err: null, addrs: dns.LookupAddress[]) => void)(null, addresses);
		} else {
			callback(null, addresses[0].address, addresses[0].family);
		}
	});
};

function request(url: URL, signal: AbortSignal, userAgent: string): Promise<IncomingMessage> {
	const client = url.protocol === "https:" ? https : http;
	return new Promise((resolve, reject) => {
		const req = client.request(
			url,
			{
				method: "GET",
				lookup: safeLookup,
				signal,
				headers: {
					"User-Agent": userAgent,
					Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
					"Accept-Language": "es,en;q=0.8",
					"Accept-Encoding": "gzip, deflate, br",
				},
			},
			resolve,
		);
		req.on("error", reject);
		req.end();
	});
}

function decoderFor(encoding: string): Transform | undefined {
	switch (encoding.trim().toLowerCase()) {
		case "gzip":
		case "x-gzip":
			return zlib.createGunzip();
		case "deflate":
			return zlib.createInflate();
		case "br":
			return zlib.createBrotliDecompress();
		default:
			return undefined;
	}
}

/** Body stream, decompressed; pipeline() forwards aborts/errors so reads never hang. */
function decompress(response: IncomingMessage): NodeJS.ReadableStream {
	const decoder = decoderFor(response.headers["content-encoding"] ?? "");
	if (!decoder) return response;
	return pipeline(response, decoder, () => {});
}

/** Reads the (decompressed) body, aborting once it exceeds maxBytes. */
async function readBody(response: IncomingMessage, maxBytes: number): Promise<Buffer> {
	const declared = Number(response.headers["content-length"]);
	if (!response.headers["content-encoding"] && declared > maxBytes) {
		response.destroy();
		throw tooLarge(maxBytes);
	}
	const chunks: Buffer[] = [];
	let total = 0;
	const stream = decompress(response);
	try {
		for await (const chunk of stream) {
			const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			total += buffer.length;
			if (total > maxBytes) throw tooLarge(maxBytes);
			chunks.push(buffer);
		}
	} finally {
		response.destroy();
	}
	return Buffer.concat(chunks);
}

function tooLarge(maxBytes: number): SiteFetchError {
	const mb = (maxBytes / 1024 / 1024).toLocaleString("es", { maximumFractionDigits: 1 });
	return new SiteFetchError(`la página pesa más de ${mb} MB`);
}

function decodeHtml(body: Buffer, contentType: string): string {
	const sniffed = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(
		body.subarray(0, 2048).toString("latin1"),
	)?.[1];
	const charset = /charset\s*=\s*"?([\w-]+)/i.exec(contentType)?.[1] ?? sniffed ?? "utf-8";
	try {
		return new TextDecoder(charset).decode(body);
	} catch {
		return new TextDecoder("utf-8").decode(body);
	}
}

function describeNetworkError(error: unknown): SiteFetchError {
	if (error instanceof SiteFetchError) return error;
	const code = (error as NodeJS.ErrnoException | undefined)?.code;
	const name = (error as Error | undefined)?.name;
	if (name === "TimeoutError" || name === "AbortError" || code === "ABORT_ERR") {
		return new SiteFetchError(
			`el sitio tardó más de ${SITE_FETCH_LIMITS.timeoutMs / 1000} s en responder`,
		);
	}
	if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
		return new SiteFetchError("no encontramos ese dominio");
	}
	if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH") {
		return new SiteFetchError("el sitio rechazó la conexión");
	}
	if (typeof code === "string" && (code.startsWith("ERR_TLS") || code.includes("CERT"))) {
		return new SiteFetchError("el certificado HTTPS del sitio no es válido");
	}
	return new SiteFetchError("no se pudo conectar con el sitio");
}

/**
 * Fetches one HTML page under the limits in SITE_FETCH_LIMITS. Throws SiteFetchError
 * (Spanish message) on any failure.
 */
export async function fetchSiteHtml(
	rawUrl: string,
	userAgent: string = BOT_USER_AGENT,
): Promise<FetchedPage> {
	const signal = AbortSignal.timeout(SITE_FETCH_LIMITS.timeoutMs);
	let url = assertFetchableUrl(rawUrl);

	try {
		for (let hop = 0; ; hop++) {
			const response = await request(url, signal, userAgent);
			const status = response.statusCode ?? 0;

			if (REDIRECT_STATUSES.has(status)) {
				response.resume();
				const location = response.headers.location;
				if (!location) throw new SiteFetchError(`redirección sin destino (estado ${status})`);
				if (hop >= SITE_FETCH_LIMITS.maxRedirects) {
					throw new SiteFetchError("el sitio redirige demasiadas veces");
				}
				url = assertFetchableUrl(new URL(location, url));
				continue;
			}

			if (status < 200 || status >= 300) {
				response.resume();
				throw new SiteFetchError(`el sitio respondió con el estado ${status}`);
			}

			const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
			if (!HTML_TYPES.some((type) => contentType.startsWith(type))) {
				response.destroy();
				throw new SiteFetchError(
					`no es una página HTML (tipo: ${contentType.split(";")[0] || "desconocido"})`,
				);
			}

			const body = await readBody(response, SITE_FETCH_LIMITS.maxBytes);
			return { url: url.href, html: decodeHtml(body, contentType) };
		}
	} catch (error) {
		throw describeNetworkError(
			signal.aborted && !(error instanceof SiteFetchError) ? signal.reason : error,
		);
	}
}
