/**
 * Pure checks for "is this IP address on the public internet?". Used by the site
 * fetcher to block SSRF towards private networks, loopback, link-local (incl. the
 * cloud metadata endpoint 169.254.169.254) and other special-purpose ranges.
 */

/** IPv4 ranges that must never be fetched: [network, prefix length]. */
const BLOCKED_IPV4: ReadonlyArray<readonly [string, number]> = [
	["0.0.0.0", 8], // "this" network
	["10.0.0.0", 8], // private
	["100.64.0.0", 10], // carrier-grade NAT
	["127.0.0.0", 8], // loopback
	["169.254.0.0", 16], // link-local, cloud metadata
	["172.16.0.0", 12], // private
	["192.0.0.0", 24], // IETF protocol assignments
	["192.0.2.0", 24], // TEST-NET-1
	["192.88.99.0", 24], // 6to4 relay anycast
	["192.168.0.0", 16], // private
	["198.18.0.0", 15], // benchmarking
	["198.51.100.0", 24], // TEST-NET-2
	["203.0.113.0", 24], // TEST-NET-3
	["224.0.0.0", 4], // multicast
	["240.0.0.0", 4], // reserved + broadcast
];

/** Parses dotted-quad IPv4 into a 32-bit unsigned number, or null. */
export function parseIPv4(ip: string): number | null {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;
	let value = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) return null;
		const octet = Number(part);
		if (octet > 255) return null;
		value = value * 256 + octet;
	}
	return value;
}

function inIPv4Range(ip: number, network: string, prefix: number): boolean {
	const net = parseIPv4(network)!;
	const size = 2 ** (32 - prefix);
	return Math.floor(ip / size) === Math.floor(net / size);
}

function isPublicIPv4(ip: number): boolean {
	return !BLOCKED_IPV4.some(([network, prefix]) => inIPv4Range(ip, network, prefix));
}

/** Expands an IPv6 address (optionally with an embedded IPv4 tail) into 8 hextets. */
export function parseIPv6(input: string): number[] | null {
	let ip = input.trim();
	if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
	const zone = ip.indexOf("%");
	if (zone !== -1) ip = ip.slice(0, zone);
	if (!ip.includes(":")) return null;

	// An IPv4 tail ("::ffff:1.2.3.4") becomes two hextets.
	const lastColon = ip.lastIndexOf(":");
	const tail = ip.slice(lastColon + 1);
	if (tail.includes(".")) {
		const v4 = parseIPv4(tail);
		if (v4 === null) return null;
		ip = `${ip.slice(0, lastColon + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
	}

	const halves = ip.split("::");
	if (halves.length > 2) return null;
	const toHextets = (part: string): number[] | null => {
		if (part === "") return [];
		const out: number[] = [];
		for (const group of part.split(":")) {
			if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
			out.push(Number.parseInt(group, 16));
		}
		return out;
	};
	const head = toHextets(halves[0]);
	const rest = halves.length === 2 ? toHextets(halves[1]) : [];
	if (!head || !rest) return null;

	if (halves.length === 1) return head.length === 8 ? head : null;
	const missing = 8 - head.length - rest.length;
	if (missing < 1) return null;
	return [...head, ...new Array<number>(missing).fill(0), ...rest];
}

function embeddedIPv4(h: number[], from: number): number {
	return h[from] * 65536 + h[from + 1];
}

function isPublicIPv6(h: number[]): boolean {
	const allZeroUntil = (n: number) => h.slice(0, n).every((x) => x === 0);

	// :: (unspecified) and ::1 (loopback)
	if (allZeroUntil(7) && (h[7] === 0 || h[7] === 1)) return false;
	// IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d → judge the IPv4 part.
	if (allZeroUntil(5) && h[5] === 0xffff) return isPublicIPv4(embeddedIPv4(h, 6));
	if (allZeroUntil(6)) return isPublicIPv4(embeddedIPv4(h, 6));
	// NAT64 64:ff9b::/96 → judge the embedded IPv4.
	if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
		return isPublicIPv4(embeddedIPv4(h, 6));
	}
	// 6to4 2002::/16 embeds an IPv4 in hextets 1–2.
	if (h[0] === 0x2002) return isPublicIPv4(embeddedIPv4(h, 1));
	// Discard-only 100::/64
	if (h[0] === 0x100 && h[1] === 0 && h[2] === 0 && h[3] === 0) return false;
	// Documentation 2001:db8::/32
	if (h[0] === 0x2001 && h[1] === 0x0db8) return false;
	// Unique local fc00::/7
	if ((h[0] & 0xfe00) === 0xfc00) return false;
	// Link-local fe80::/10 and deprecated site-local fec0::/10
	if ((h[0] & 0xffc0) === 0xfe80 || (h[0] & 0xffc0) === 0xfec0) return false;
	// Multicast ff00::/8
	if ((h[0] & 0xff00) === 0xff00) return false;
	return true;
}

/**
 * True only for a syntactically valid IPv4/IPv6 address outside every private,
 * loopback, link-local, multicast, documentation or otherwise reserved range.
 * Anything unparseable is treated as NOT public.
 */
export function isPublicAddress(ip: string): boolean {
	const v4 = parseIPv4(ip.trim());
	if (v4 !== null) return isPublicIPv4(v4);
	const v6 = parseIPv6(ip);
	if (v6 !== null) return isPublicIPv6(v6);
	return false;
}
