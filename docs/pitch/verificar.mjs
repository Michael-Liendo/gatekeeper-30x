/*
 * Mide todas las láminas y falla si alguna se desborda.
 *
 * Un deck es de las pocas cosas que no avisan cuando están rotas: se ven
 * perfectas en el editor y se recortan en el proyector.
 *
 * Necesita playwright con su chromium, que no es dependencia del proyecto —
 * esto es una herramienta de escritorio, no parte del build:
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node docs/pitch/verificar.mjs            → mide
 *   node docs/pitch/verificar.mjs --fotos    → mide y guarda las capturas (en $SALIDA o /tmp/pitch)
 *
 * Acepta la carpeta del deck como argumento, para poder correrlo desde donde
 * playwright esté instalado sin mover nada de sitio.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const fotos = process.argv.includes("--fotos");
const carpeta = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? import.meta.dirname;
const salida = process.env.SALIDA ?? "/tmp/pitch";
if (fotos) mkdirSync(salida, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`file://${carpeta}/index.html`);
// Las fuentes cambian el alto del texto: medir antes de que carguen es medir otra cosa.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const total = await page.locator(".slide").count();
let malas = 0;

for (let i = 0; i < total; i++) {
	await page.keyboard.press("Home");
	for (let k = 0; k < i; k++) await page.keyboard.press("ArrowRight");
	await page.waitForTimeout(80);

	const m = await page.evaluate(() => {
		const slide = document.querySelector(".slide.on");
		const body = slide.querySelector(".body");
		return {
			sobra: body.scrollHeight - body.clientHeight,
			titulo: slide.querySelector("h1, h2")?.textContent.trim().slice(0, 46) ?? "",
		};
	});

	const mal = m.sobra > 1;
	if (mal) malas += 1;
	console.log(
		`${String(i + 1).padStart(2, "0")} ${mal ? `❌ se sale ${m.sobra}px` : "✓        "} · ${m.titulo}`,
	);

	if (fotos) {
		await page
			.locator(".slide.on")
			.screenshot({ path: `${salida}/${String(i + 1).padStart(2, "0")}.png` });
	}
}

await browser.close();
console.log(malas === 0 ? `\nLas ${total} caben.` : `\n${malas} lámina(s) se desbordan.`);
process.exit(malas === 0 ? 0 : 1);
