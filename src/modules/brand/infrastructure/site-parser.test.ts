import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";

// site-parser.ts imports its siblings without an extension (as tsc and the bundler
// expect). Node's ESM resolver needs the extension, so retry relative specifiers with ".ts".
registerHooks({
	resolve(specifier, context, nextResolve) {
		try {
			return nextResolve(specifier, context);
		} catch (error) {
			if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
});

// Loaded by URL so the same file runs under `node --test` (which needs the .ts extension)
// and type-checks under tsc (which rejects .ts extensions in static imports).
const parserModule = new URL("./site-parser.ts", import.meta.url).href;
const { parseSite } = (await import(parserModule)) as typeof import("./site-parser");

const FIXTURE = `<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<title>Café Andino &mdash; Tostadores de especialidad</title>
	<meta name="description" content="Café de especialidad de origen &quot;único&quot;, tostado en Bogotá.">
	<meta property="og:title" content="Café Andino">
	<meta property="og:description" content="Tostadores de especialidad">
	<meta property="og:site_name" content="Café Andino">
	<meta property="og:image" content="/img/og.jpg">
	<meta name="theme-color" content="#6B2D1A">
	<link rel="apple-touch-icon" href="/apple-touch-icon.png">
	<link rel="icon" type="image/png" href="https://cdn.example.org/favicon.png">
	<style>
		:root { --brand: #6b2d1a; --accent: #E9A23B; }
		#fade { color: #333; background: #ffffff; }
		.btn { background-color: #E9A23B; border: 1px solid rgba(0, 0, 0, 0.1); }
	</style>
	<script>window.color = "#123456"; document.body.style.color = "#abcdef";</script>
</head>
<body>
	<!-- <img src="/old-logo.png" alt="logo viejo"> -->
	<header>
		<a href="/"><img class="site-logo" src="assets/logo.svg" alt="Café Andino"></a>
		<nav>
			<a href="/tienda">Tienda</a>
			<a href="/suscripcion">Suscripción&nbsp;mensual</a>
			<a href="/blog"><span>Blog</span></a>
		</nav>
	</header>
	<main>
		<h1>Café que <em>sabe</em> a origen</h1>
		<h2>Nuestros cafés</h2>
		<h2>Cómo tostamos</h2>
		<p style="color:#6B2D1A">Seleccionamos granos de fincas de Huila y Nariño.</p>
		<noscript>Activa JavaScript</noscript>
		<svg><path fill="#E9A23B" d="M0 0h1v1z"/></svg>
	</main>
</body>
</html>`;

describe("parseSite", () => {
	const site = parseSite(FIXTURE, "https://cafe.example.com/es/inicio");

	it("reads title and meta tags with entities decoded", () => {
		assert.equal(site.lang, "es");
		assert.equal(site.title, "Café Andino — Tostadores de especialidad");
		assert.equal(site.description, 'Café de especialidad de origen "único", tostado en Bogotá.');
		assert.equal(site.ogTitle, "Café Andino");
		assert.equal(site.ogDescription, "Tostadores de especialidad");
		assert.equal(site.siteName, "Café Andino");
		assert.equal(site.themeColor, "#6B2D1A");
	});

	it("resolves images and icons to absolute URLs, logo first", () => {
		assert.equal(site.ogImage, "https://cafe.example.com/img/og.jpg");
		assert.deepEqual(site.icons, [
			"https://cafe.example.com/apple-touch-icon.png",
			"https://cdn.example.org/favicon.png",
		]);
		assert.deepEqual(site.logoCandidates, [
			"https://cafe.example.com/es/assets/logo.svg",
			"https://cafe.example.com/apple-touch-icon.png",
			"https://cdn.example.org/favicon.png",
			"https://cafe.example.com/img/og.jpg",
		]);
	});

	it("collects headings and nav link texts", () => {
		assert.deepEqual(site.h1, ["Café que sabe a origen"]);
		assert.deepEqual(site.h2, ["Nuestros cafés", "Cómo tostamos"]);
		assert.deepEqual(site.navLinks, ["Tienda", "Suscripción mensual", "Blog"]);
	});

	it("keeps only visible text", () => {
		assert.match(site.textSample, /Seleccionamos granos de fincas de Huila y Nariño\./);
		assert.match(site.textSample, /Café que sabe a origen/);
		assert.doesNotMatch(site.textSample, /window\.color|Activa JavaScript|#E9A23B|logo viejo/);
		assert.ok(site.textSample.length <= 6000);
	});

	it("ranks brand colors from theme-color, styles and SVG, ignoring scripts and neutrals", () => {
		assert.deepEqual(site.colors, ["#6B2D1A", "#E9A23B"]);
	});

	it("caps the text sample", () => {
		const long = `<body><p>${"palabra ".repeat(2000)}</p></body>`;
		assert.equal(parseSite(long, "https://x.example").textSample.length, 6000);
	});
});
