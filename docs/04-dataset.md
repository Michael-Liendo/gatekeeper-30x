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
