# Playbook de aplicación

El entregable 1 del reto ([01-reto.md](../01-reto.md)): las decisiones que toma JEV,
el esquema de preguntas, los umbrales, quién lo opera y cómo se mide. Va en dos
formatos con el mismo contenido:

- `index.html` — **8 láminas** para presentar, con guion por lámina.
- `playbook.md` — la versión escrita (≤ 5 páginas), para quien prefiera leer.

## Abrirlo

```
open docs/playbook/index.html
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
actual (`#3`).

El guion completo son ~720 palabras: unos 5–6 minutos a ritmo normal.

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
cp <repo>/docs/playbook/verificar.mjs . && node verificar.mjs <repo>/docs/playbook --fotos
```

Las capturas quedan en `/tmp/playbook/` (o en `$SALIDA`). Míralas: medir no basta.

## Las cifras

Ninguna es inventada. Salen de [05-calibracion.md](../05-calibracion.md) (contenido
y prueba de escala), de [12-segmentacion.md](../12-segmentacion.md) (inscritos), de la
política en `src/modules/content-review/domain/editorial-policy.ts`, de los
preajustes en `src/modules/content-review/ui/policy-presets.ts` y de pruebas en
producción. Si cambia la política calibrada, se actualizan las láminas 4 y 7 y
`playbook.md`; si cambia una medición de inscritos, la lámina 8.
