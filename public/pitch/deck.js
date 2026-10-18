/*
 * Navegación de las láminas del pitch.
 *
 * Cincuenta líneas y ninguna dependencia, a propósito: esto se abre desde un
 * archivo local en un navegador que no es el tuyo, cinco minutos antes de
 * hablar y a veces sin internet.
 *
 * La lámina mide 1280×720 fijos y se escala al hueco que haya. Es lo contrario
 * de lo que uno haría en una web: aquí el tamaño de letra NO puede depender de
 * la ventana, porque lo que se ensayó anoche tiene que verse igual en el
 * proyector de mañana.
 *
 * Las notas del que habla salen en **otra ventana**, y eso no es un lujo: esto
 * se presenta por Zoom compartiendo pantalla. Con las notas debajo de la lámina
 * —como estaban— el jurado lee el guion completo. Se comparte la ventana de las
 * láminas y la de las notas se queda en otro escritorio, en un segundo monitor
 * o en el teléfono. La tecla N sigue existiendo para ensayar solo.
 */

const slides = [...document.querySelectorAll(".slide")];
const stage = document.getElementById("stage");
const notes = document.getElementById("notes");

let at = 0;

function fit() {
	// El menor de los dos lados manda, para que nunca se recorte.
	const pad = document.body.classList.contains("notes") ? 0.64 : 0.94;
	const scale = Math.min(window.innerWidth / 1280, (window.innerHeight * pad) / 720);
	const shift = document.body.classList.contains("notes") ? -(window.innerHeight * 0.17) : 0;

	for (const slide of slides) {
		slide.style.transform = `translateY(${shift}px) scale(${scale})`;
	}
}

function show(index) {
	at = Math.max(0, Math.min(slides.length - 1, index));

	for (const [i, slide] of slides.entries()) {
		slide.classList.toggle("on", i === at);
	}

	const script = slides[at].dataset.notes ?? "";
	notes.innerHTML = `<b>Lámina ${at + 1} de ${slides.length}</b>${script}`;

	// En la barra de direcciones, para poder volver a la misma lámina si el
	// navegador se cierra a mitad de un ensayo.
	history.replaceState(null, "", `#${at + 1}`);
	fit();
	paintPresenter();
}

document.addEventListener("keydown", (event) => {
	// La ayuda de teclas se va con la primera tecla. Está para que alguien que
	// abre esto por primera vez sepa moverse, y en un pitch esa esquina la ve el
	// jurado proyectada: sobrevivir al primer avance ya sería demasiado.
	document.getElementById("help")?.remove();

	switch (event.key) {
		case "ArrowRight":
		case "ArrowDown":
		case " ":
		case "PageDown":
			event.preventDefault();
			show(at + 1);
			break;
		case "ArrowLeft":
		case "ArrowUp":
		case "PageUp":
			event.preventDefault();
			show(at - 1);
			break;
		case "Home":
			show(0);
			break;
		case "End":
			show(slides.length - 1);
			break;
		case "n":
		case "N":
			// Debajo de la lámina: para ensayar solo, nunca compartiendo pantalla.
			document.body.classList.toggle("notes");
			fit();
			break;
		case "p":
		case "P":
			// La ventana aparte, que es la que se usa el día del pitch.
			openPresenter();
			break;
		case "f":
		case "F":
			if (document.fullscreenElement) document.exitFullscreen();
			else document.documentElement.requestFullscreen?.();
			break;
	}
});

// Tocar la mitad derecha avanza; la izquierda retrocede. Para pasarlas desde el
// teléfono si toca presentar sin teclado.
stage.addEventListener("click", (event) => {
	show(event.clientX > window.innerWidth / 2 ? at + 1 : at - 1);
});

/**
 * La vista del que habla, en una ventana suya.
 *
 * Se abre con P y se queda sincronizada: cada vez que cambia la lámina se
 * reescribe. Lleva el guion **entero**, de la primera a la última, con la de
 * ahora resaltada y a la vista: para ensayar se lee de corrido, y a mitad del
 * pitch se ve de un vistazo lo que viene. Arriba, fija, la siguiente — saber
 * hacia dónde vas antes de llegar — y cuánto dura todo; cada lámina dice lo
 * suyo, dicha a un ritmo normal.
 *
 * Se escribe el documento entero de una vez en vez de mantener una referencia
 * viva: son nueve láminas, y así no hay nada que se desincronice si la ventana
 * se cierra y se vuelve a abrir.
 */
let presenter = null;

/** Palabras por minuto a ritmo de pitch: con energía, sin correr. */
const WORDS_PER_MINUTE = 150;

const words = (text) => text.split(/\s+/).filter(Boolean).length;

function clock(count) {
	const seconds = Math.round((count / WORDS_PER_MINUTE) * 60);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function openPresenter() {
	if (!presenter || presenter.closed) {
		presenter = window.open("", "gatekeeper-presenter", "width=560,height=760");
		if (!presenter) return; // El navegador bloqueó la ventana emergente.
	}

	presenter.focus();
	paintPresenter();
}

function paintPresenter() {
	if (!presenter || presenter.closed) return;

	const next = slides[at + 1];
	const titleOf = (slide) => slide?.querySelector("h1, h2")?.textContent?.trim() ?? "—";
	const total = slides.reduce((sum, slide) => sum + words(slide.dataset.notes ?? ""), 0);

	const script = slides
		.map((slide, i) => {
			const text = slide.dataset.notes ?? "";
			return `
				<section${i === at ? ' id="now" class="now"' : ""}>
					<div class="n">${String(i + 1).padStart(2, "0")} · ${clock(words(text))}</div>
					<h2>${titleOf(slide)}</h2>
					<p>${text}</p>
				</section>`;
		})
		.join("");

	presenter.document.body.innerHTML = `
		<style>
			body { margin:0; padding:0 22px 40vh; background:#1c1c1e; color:#ececf1;
			       font:16px/1.55 Poppins,-apple-system,system-ui,sans-serif; }
			header { position:sticky; top:0; z-index:1; background:#1c1c1e;
			         padding:18px 0 12px; border-bottom:1px solid #34343a; }
			.n { font:12px ui-monospace,monospace; letter-spacing:.12em;
			     text-transform:uppercase; color:#8a8f9c; margin-bottom:6px; }
			header .n, .now .n { color:#cfd0ff; }
			.next { color:#8a8f9c; font-size:15px; }
			section { padding:16px 0 16px 14px; border-left:3px solid transparent;
			          opacity:.42; scroll-margin-top:92px; }
			section.now { opacity:1; border-left-color:#cfd0ff; }
			h2 { font-size:18px; line-height:1.25; margin:0 0 8px; }
			.now h2 { font-size:23px; }
			p { margin:0; }
		</style>
		<header>
			<div class="n">Lámina ${at + 1} de ${slides.length} · guion completo: ${total} palabras, ${clock(total)}</div>
			<div class="next"><strong>Sigue:</strong> ${next ? titleOf(next) : "— fin —"}</div>
		</header>
		${script}
	`;
	presenter.document.title = `Notas · ${at + 1}/${slides.length}`;
	// La de ahora, arriba y a la vista, justo debajo de la cabecera fija.
	presenter.document.getElementById("now")?.scrollIntoView({ block: "start" });
}

window.addEventListener("resize", fit);

show(Number(location.hash.slice(1)) - 1 || 0);
