# El pitch

Diez láminas para la final del Hackathon 30X, pensadas para la dirección de 30X
y jurados de negocio. Parten del problema de los equipos que producen contenido
con IA: la IA multiplicó lo que el equipo produce; nadie multiplicó la revisión.
El cuello de botella pasó de crear a aprobar. Responden la pregunta del reto
(qué decisiones de 30X puede tomar JEV miles de veces al día, en milisegundos)
con dos decisiones que ya funcionan y una prueba de escala real:

1. **Media:** ¿esta pieza sale?
2. **Comercial** (el mismo motor, otra decisión): ¿a qué programa va este
   inscrito de Luma y lo llamamos ya?

JEV es el protagonista: el motor que decide. Hablan de cómo cambia el día del
equipo: el editor solo ve lo dudoso, la IA corrige lo que falló y el equipo
vuelve a crear. Lo técnico vive en el
[playbook](../playbook/).

| # | Lámina |
|---|---|
| 01 | Portada: decisiones que JEV toma miles de veces al día, para que el equipo vuelva a crear |
| 02 | El problema: la IA multiplicó lo que se produce, no la revisión |
| 03 | La solución: JEV decide, el editor solo ve lo dudoso, la IA corrige |
| 04 | Decisión 1: cómo se vive en Media |
| 05 | Un caso real: de spam a post de 30X |
| 06 | Hecho para tu marca |
| 07 | Inscritos de Luma: el mismo motor, otra decisión |
| 08 | Resultados: 1.000 decisiones en 4,5 segundos · 4 de 10 piezas sin revisión |
| 09 | Qué gana 30X: el equipo deja de aprobar a mano y vuelve a crear |
| 10 | Cierre: JEV ya está decidiendo |

- `index.html` — las láminas, con lo que se dice en voz alta en cada una.
- `guion.md` — el mismo guion para leer de corrido y ensayar, con las frases que
  se pueden quitar si vas justo y respuestas cortas para el Q&A.
- `deck.css` / `deck.js` — estilo y navegación, copiados del playbook.
- `verificar.mjs` — mide las diez láminas y saca capturas.

## Abrirlo

```
open docs/pitch/index.html
```

No necesita servidor ni build. Solo carga Poppins de Google Fonts; sin internet
cae a la fuente del sistema y sigue funcionando.

## Teclas

| Tecla | Qué hace |
|---|---|
| `→` `espacio` | Siguiente |
| `←` | Anterior |
| `Inicio` / `Fin` | Primera / última |
| `F` | Pantalla completa |
| `P` | Abre las notas **en otra ventana** (la que se usa al presentar) |
| `N` | Pone las notas debajo de la lámina (solo para ensayar) |

Si presentas compartiendo pantalla, comparte solo la ventana de las láminas y deja
la de notas (`P`) aparte: con `N` el público lee el guion. También se pasan
tocando: la mitad derecha avanza, la izquierda retrocede. La URL guarda la lámina
actual (`#5`).

## El tiempo

El guion son ~850 palabras: **unos 5 minutos** a ritmo de pitch. La
ventana de notas (`P`) calcula el tiempo a 150 palabras por minuto, así que ahí
marcará algo más. Si vas justo, en `guion.md` cada lámina tiene una frase
marcada que se puede quitar; sin ellas queda en unos 4 minutos y medio. La **05** (el
caso real), la **07** (inscritos) y la **08** (resultados) no se recortan: son
las que convencen.

## Las cifras

Solo estas, y ninguna inventada:

| Cifra | De dónde sale |
|---|---|
| 1.000 decisiones en 4,5 s · 222 por segundo · 128 ms cada una (p95 250 ms) · 0 respaldos | Prueba de escala con JEV `jev-1.13.0` en producción, 17 oct 2026, [05-calibracion.md](../05-calibracion.md) |
| 80–87 % de acierto según la corrida, 4 de 10 sin persona (42 %), 0 riesgosas aprobadas solas, ~0,3 s con imagen | 45 piezas simuladas de 30X, [05-calibracion.md](../05-calibracion.md) |
| 55,5 % coincide con el programa de 30X (60 % donde 30X sugirió uno; 95 % en AI Sales), 88 % de precisión en «listo para un asesor», 93 ms por persona | 200 de los 697 perfiles anónimos de inscritos de 30X, JEV en producción, [12-segmentacion.md](../12-segmentacion.md) |
| 697 inscritos | Hoja anónima de inscritos que compartió 30X |
| 425 mil seguidores, 1.500+ publicaciones | Perfil público de @crece30x en Instagram |

Si cambia una medición, se actualizan las láminas 07 y 08, `guion.md` y el playbook.

## PDF

Imprimir (`⌘P`) → Guardar como PDF, con «gráficos de fondo» activado. Sale una
lámina por página.

## Antes de editar, verifica

Las láminas miden 1280×720 fijos y lo que sobra se recorta sin avisar.
`verificar.mjs` las mide todas y falla si alguna se desborda. Necesita
playwright, que **no** es dependencia del proyecto: instálalo en una carpeta
aparte, copia el script ahí y pásale la ruta del deck.

```
mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install chromium
cp <repo>/docs/pitch/verificar.mjs . && node verificar.mjs <repo>/docs/pitch --fotos
```

Las capturas quedan en `/tmp/pitch/` (o en `$SALIDA`). Míralas: medir no basta.
