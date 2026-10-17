# Dataset simulado de contenido

El demo de Gatekeeper Editorial 30X usa un set de **45 piezas de contenido 100 % simuladas**
en `src/modules/content-review/infrastructure/sample-content.ts`. Imitan lo que 30X Media
publicaría: posts de LinkedIn e Instagram, guiones de YouTube, captions de clips, notas de
newsletter e introducciones de blog.

Cada pieza trae una `expectedRoute` (la ruta que esperamos) para medir la precisión del
gatekeeper en el demo. Ese campo **nunca se envía a JEV ni al LLM**.

## Mezcla

| Ruta esperada     | Piezas | Qué representa                                                                                                   |
| ----------------- | -----: | ---------------------------------------------------------------------------------------------------------------- |
| `AUTO_APPROVE`    |     15 | Contenido relevante, accionable y con tono sobrio (IA, ventas, growth, fundraising, liderazgo, comunidad).        |
| `ENRICH_WITH_LLM` |     10 | Contenido correcto con problemas corregibles: muy promocional, cifras sin fuente, título débil o demasiado genérico. |
| `HUMAN_REVIEW`    |     10 | Casos riesgosos o ambiguos: política, salud, promesas exageradas o garantizadas, ataques a competidores, ofertas que 30X no vende, temas fuera de línea. |
| `REJECT`          |     10 | Spam, cripto pump, memes ajenos, texto sin sentido, granjas de enlaces, estafas.                                 |
| **Total**         | **45** |                                                                                                                  |

## Reglas

- **Todo es ficticio.** No hay personas reales, ni datos privados de empresas, ni nombres
  del equipo o mentores de 30X. Los autores son roles: «Equipo Media 30X», «Generado por IA»,
  «Community manager», «Mentor invitado (simulado)».
- Las únicas ofertas de 30X mencionadas son las reales: Inmersión Ejecutiva, programas de
  Ventas, Growth e IA, clases gratis y comunidad. Las piezas que mencionan otras ofertas
  (certificación universitaria, crédito, fondos de inversión) existen a propósito para probar
  la ruta `HUMAN_REVIEW`.
- Los enlaces usan el dominio reservado `.example`.
- Fechas: octubre de 2026. IDs: `cp-001` a `cp-045`.

## Imágenes

Cada pieza tiene una imagen simulada en `public/samples/<id>.jpg` (campo `imagePath`, por
ejemplo `/samples/cp-001.jpg`). Se generan con `gpt-image-2` a partir del título, el cuerpo,
el formato, el canal y la ruta esperada:

| Ruta esperada                        | Estilo de la imagen                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `AUTO_APPROVE`, `ENRICH_WITH_LLM`    | Portada editorial limpia: titular en español sobre fondo plano lima, negro o blanco roto, «30X» pequeño abajo. |
| `HUMAN_REVIEW`                       | El mismo estilo limpio, pero con la promesa o afirmación problemática bien visible (p. ej. «Resultados garantizados»). |
| `REJECT`                             | Estética de spam o estafa (neón, formas tipo emoji, «¡GANA YA!») o meme fuera de tema, sin marca 30X.      |

Reglas: sin personas reales, sin caras, sin logos ni marcas de terceros. El estilo toma como
referencia el tono público de 30X, pero ninguna imagen copia una publicación real.

Al revisar el dataset, el servidor lee la imagen desde `public/` y se la pasa al motor de
decisión junto con el texto, igual que una captura subida a mano. Si el archivo no existe, la
pieza se revisa solo con el texto.

### Generar o regenerar las imágenes

Requiere `OPENAI_API_KEY` (en el entorno o en `.env.local`):

```bash
node scripts/generate-sample-images.mjs                      # solo las que faltan
node scripts/generate-sample-images.mjs --only cp-001,cp-031 # algunas piezas
node scripts/generate-sample-images.mjs --force              # todas de nuevo
node scripts/generate-sample-images.mjs --dry-run            # ver los prompts sin llamar a la API
```

El script genera 4 imágenes a la vez, reintenta 2 veces y salta las que ya existen, así que se
puede volver a lanzar si se corta. Las imágenes nuevas se usan sin reiniciar; si reemplazas una
que el servidor ya leyó, reinícialo para que tome la nueva.
