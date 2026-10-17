# El pitch

Nueve láminas para la final del Hackathon 30X, pensadas para la dirección de 30X
y jurados de negocio. Hablan de decisiones, tiempo, riesgo, marca y dinero; lo
técnico vive en el [playbook](../playbook/) y aquí solo se le menciona una vez.

- `index.html` — las láminas, con lo que se dice en voz alta en cada una.
- `guion.md` — el mismo guion para leer de corrido y ensayar, con las frases que
  se pueden quitar si vas justo y respuestas cortas para el Q&A.
- `deck.css` / `deck.js` — estilo y navegación, copiados del playbook.
- `verificar.mjs` — mide las nueve láminas y saca capturas.

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

El guion son ~670 palabras: **unos 4 minutos** a ritmo de pitch. La ventana de
notas (`P`) calcula el tiempo a 150 palabras por minuto. Si vas justo, en
`guion.md` cada lámina tiene una frase marcada que se puede quitar; sin ellas
queda en unos 3:30. La **05** (el caso real) y la **07** (resultados) no se
recortan: son las que convencen.

## Las cifras

Solo estas, y ninguna inventada:

| Cifra | De dónde sale |
|---|---|
| Menos de 1 segundo por pieza (0,1–0,2 s) | Medido en producción |
| Menos de un centavo por cada 100 piezas (≈ USD 0,05 / 1.000) | Medido en producción |
| 80–87 % de acierto, 4 de 10 sin persona, 0 riesgosas aprobadas solas | 45 piezas simuladas de 30X, [05-calibracion.md](../05-calibracion.md) |
| 425 mil seguidores, 1.500+ publicaciones | Perfil público de @crece30x en Instagram |

Si cambia la calibración, se actualizan la lámina 07, `guion.md` y el playbook.

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
