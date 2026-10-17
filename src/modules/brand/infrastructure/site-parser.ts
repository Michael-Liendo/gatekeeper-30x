import {
	type ColorMention,
	colorMentionsFromCss,
	rankColorCandidates,
} from "../domain/color-candidates";

/**
 * Lightweight HTML reader for brand onboarding. Regex-based on purpose: we only
 * need a handful of tags from one page, and it keeps the bundle free of a DOM
 * parser. No I/O and no "server-only", so it can be unit-tested directly.
 */

export interface ParsedSite {
	url: string;
	lang?: string;
	title?: string;
	description?: string;
	ogTitle?: string;
	ogDescription?: string;
	siteName?: string;
	ogImage?: string;
	themeColor?: string;
	/** `<link rel="icon|apple-touch-icon">` targets, absolute. */
	icons: string[];
	/** Best guesses for the logo, best first: logo `<img>`, apple-touch-icon, icon, og:image. */
	logoCandidates: string[];
	h1: string[];
	h2: string[];
	navLinks: string[];
	/** Visible text, scripts and styles stripped, at most `MAX_TEXT_SAMPLE` chars. */
	textSample: string;
	/** Raw color mentions (for merging several pages). */
	colorMentions: ColorMention[];
	/** Ranked brand color candidates for this page alone (#RRGGBB). */
	colors: string[];
}

export const MAX_TEXT_SAMPLE = 6000;
const MAX_LIST_ITEMS = 20;
/** theme-color is an explicit brand signal: it outweighs scattered CSS mentions. */
const THEME_COLOR_WEIGHT = 10;

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	aacute: "á",
	eacute: "é",
	iacute: "í",
	oacute: "ó",
	uacute: "ú",
	Aacute: "Á",
	Eacute: "É",
	Iacute: "Í",
	Oacute: "Ó",
	Uacute: "Ú",
	ntilde: "ñ",
	Ntilde: "Ñ",
	uuml: "ü",
	Uuml: "Ü",
	iexcl: "¡",
	iquest: "¿",
	copy: "©",
	reg: "®",
	trade: "™",
	hellip: "…",
	mdash: "—",
	ndash: "–",
	laquo: "«",
	raquo: "»",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	middot: "·",
	bull: "•",
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
		if (code[0] === "#") {
			const n =
				code[1] === "x" || code[1] === "X"
					? Number.parseInt(code.slice(2), 16)
					: Number.parseInt(code.slice(1), 10);
			try {
				return String.fromCodePoint(n);
			} catch {
				return whole;
			}
		}
		return NAMED_ENTITIES[code] ?? whole;
	});
}

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

/** Strips tags and entities from an HTML fragment into one line of text. */
function fragmentText(html: string): string {
	return collapse(decodeEntities(html.replace(/<[^>]*>/g, " ")));
}

/** Parses the attributes of one start tag into a lower-cased-key map (values decoded). */
export function parseAttributes(attrs: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	for (const m of attrs.matchAll(re)) {
		const name = m[1].toLowerCase();
		if (name in out) continue;
		out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
	}
	return out;
}

/** Every start tag `<name ...>` in the document, with its attributes. */
function findTags(html: string, name: string): Record<string, string>[] {
	const re = new RegExp(`<${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, "gi");
	return [...html.matchAll(re)].map((m) => parseAttributes(m[1]));
}

/** Inner HTML of every `<name>...</name>` element (non-nested match). */
function findElements(html: string, name: string): string[] {
	const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}\\s*>`, "gi");
	return [...html.matchAll(re)].map((m) => m[1]);
}

function removeElements(html: string, names: string[]): string {
	let out = html;
	for (const name of names) {
		out = out.replace(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?</${name}\\s*>`, "gi"), " ");
	}
	return out;
}

function toAbsolute(href: string | undefined, base: string): string | undefined {
	if (!href) return undefined;
	const trimmed = href.trim();
	if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
		return undefined;
	}
	try {
		const url = new URL(trimmed, base);
		return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
	} catch {
		return undefined;
	}
}

const unique = (items: Array<string | undefined>, limit = MAX_LIST_ITEMS): string[] =>
	[...new Set(items.filter((x): x is string => Boolean(x)))].slice(0, limit);

/** Turns the visible part of the page into plain text. */
function visibleText(html: string): string {
	const body = /<body\b[^>]*>([\s\S]*)<\/body\s*>/i.exec(html)?.[1] ?? html;
	const withoutHidden = removeElements(body, [
		"script",
		"style",
		"noscript",
		"template",
		"svg",
		"iframe",
		"head",
	]);
	const withBreaks = withoutHidden.replace(
		/<\/?(?:p|div|section|article|header|footer|li|ul|ol|h[1-6]|br|tr|nav|main|aside)\b[^>]*>/gi,
		"\n",
	);
	const text = decodeEntities(withBreaks.replace(/<[^>]*>/g, " "))
		.split("\n")
		.map(collapse)
		.filter(Boolean)
		.join("\n");
	return text.slice(0, MAX_TEXT_SAMPLE);
}

/** Extracts the brand-relevant bits of one HTML page. `url` is the page's final URL. */
export function parseSite(html: string, url: string): ParsedSite {
	const source = html.replace(/<!--[\s\S]*?-->/g, " ");
	const base = toAbsolute(findTags(source, "base")[0]?.href, url) ?? url;

	const metas = findTags(source, "meta");
	const meta = (key: string) => {
		const found = metas.find(
			(m) => m.name?.toLowerCase() === key || m.property?.toLowerCase() === key,
		);
		const value = found?.content ? collapse(found.content) : "";
		return value || undefined;
	};

	const links = findTags(source, "link");
	const rels = (link: Record<string, string>) => (link.rel ?? "").toLowerCase().split(/\s+/);
	const appleIcons = links
		.filter((l) => rels(l).some((r) => r.startsWith("apple-touch-icon")))
		.map((l) => toAbsolute(l.href, base));
	const icons = links.filter((l) => rels(l).includes("icon")).map((l) => toAbsolute(l.href, base));

	const logoImages = findTags(source, "img")
		.filter((img) =>
			[img.src, img.alt, img.class, img.id].some((v) => v?.toLowerCase().includes("logo")),
		)
		.map((img) => toAbsolute(img.src ?? img["data-src"], base));

	const ogImage = toAbsolute(meta("og:image"), base);
	const themeColor = meta("theme-color");

	const colorMentions: ColorMention[] = [];
	if (themeColor) colorMentions.push({ color: themeColor, weight: THEME_COLOR_WEIGHT });
	for (const css of findElements(source, "style")) {
		colorMentions.push(...colorMentionsFromCss(css));
	}
	const styleAttr = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
	for (const m of source.matchAll(styleAttr)) {
		colorMentions.push(...colorMentionsFromCss(decodeEntities(m[1] ?? m[2] ?? "")));
	}
	// Inline SVG fills/strokes: logos and icons are often drawn in the brand color.
	const paintAttr = /\s(?:fill|stroke|stop-color)\s*=\s*["'](#[0-9a-fA-F]{3,8})["']/g;
	for (const m of source.matchAll(paintAttr)) {
		colorMentions.push({ color: m[1] });
	}

	const titleHtml = findElements(source, "title")[0];
	const navHtml = [...findElements(source, "nav"), ...findElements(source, "header")].join(" ");

	return {
		url,
		lang: findTags(source, "html")[0]?.lang || undefined,
		title: titleHtml ? fragmentText(titleHtml) || undefined : undefined,
		description: meta("description"),
		ogTitle: meta("og:title"),
		ogDescription: meta("og:description"),
		siteName: meta("og:site_name") ?? meta("application-name"),
		ogImage,
		themeColor,
		icons: unique([...appleIcons, ...icons]),
		logoCandidates: unique([...logoImages, ...appleIcons, ...icons, ogImage], 8),
		h1: unique(findElements(source, "h1").map(fragmentText)),
		h2: unique(findElements(source, "h2").map(fragmentText)),
		navLinks: unique(findElements(navHtml, "a").map(fragmentText), 30),
		textSample: visibleText(source),
		colorMentions,
		colors: rankColorCandidates(colorMentions),
	};
}
