# Gatekeeper Editorial 30X — diseño base

**Idea en una frase:** el equipo de Media (o una IA) genera piezas (posts, guiones, clips, newsletters) y JEV **aprueba, rechaza o manda a revisión** cada una según reglas claras de 30X. El equipo solo revisa lo dudoso.

## Flujo

```
pieza de contenido (texto, guion, copy)
 → JEV responde varias preguntas simples en una sola pasada
 → el código aplica reglas y umbrales
 → ✅ aprobar | ✏️ LLM sugiere ajustes | 👤 revisión humana | ❌ descartar
```

## Preguntas tipadas

| Tipo | Pregunta | Opciones |
|---|---|---|
| `choice` | Tema principal | IA, Ventas, Growth, Startups/Fundraising, Liderazgo, Otro |
| `choice` | Formato | Post, Guion de video, Clip, Newsletter, Otro |
| `score` | Relevancia para fundadores y ejecutivos | Baja, Media, Alta |
| `score` | Accionable (¿deja algo útil?) | Nada, Algo, Mucho |
| `noul` | ¿Es demasiado promocional? | — |
| `noul` | ¿Hace promesas exageradas? | — |
| `noul` | ¿Menciona datos o cifras sin fuente? | — |
| `noul` | ¿Tiene riesgo de marca (política, ataques, temas sensibles)? | — |
| `noul` | ¿Ofrece algo que 30X no vende? | — |

## Reglas en código (composite scoring)
- **Bloqueo duro:** riesgo de marca o promesas exageradas > 0,7 → descartar o revisión humana.
- **Puntaje editorial** = relevancia + accionable − promocional − datos sin fuente.
- **Aprobar** solo si el puntaje es alto, ningún noul está en rojo y la confianza es ≥ 0,85.
- **Zona gris (0,6–0,85):** un LLM sugiere la corrección y pasa a revisión.
- **< 0,6 o tema "Otro":** revisión humana.

## Diferenciadores
1. **Política editorial configurable:** Media edita reglas y umbrales en un panel, sin programar.
2. **Explica el porqué:** cada rechazo dice qué regla falló (ej. "promocional 0,91").
3. **System One + System Two:** JEV filtra todo rápido y barato; el LLM solo en la zona gris.
4. **Extra:** `box` para revisar miniaturas o imágenes.

## Quién lo opera
El editor o líder de Media de 30X, desde una cola con los casos escalados (aprobar o corregir con un clic).

## Cómo se mide
- % aprobado automático, % escalado, % descartado
- Precisión: decisiones automáticas confirmadas por el editor
- Costo por pieza y latencia
- Horas de revisión ahorradas

## Demo
- 40–50 piezas simuladas (buenas, malas, promocionales, con riesgo, dudosas).
- Panel con piezas, decisión, porqué, confianza y costo.
- Editor de reglas: mover un umbral y ver cómo cambian las decisiones en vivo.

## Escala
El mismo motor (estado + preguntas + umbrales + acciones) sirve después para leads e inscritos, riesgo de abandono o guardrails de agentes: cada decisión nueva es configuración, no código nuevo.

## Rutas de decisión (nombres en el código)

Tomado del documento de Haron, ajustado a nuestros umbrales:

| Ruta | Condición (por defecto, configurable) | Acción |
|---|---|---|
| `AUTO_APPROVE` | Confianza ≥ 0,85, fit editorial ≥ 0,85, ningún noul de riesgo en rojo | Se aprueba, se etiqueta (tema, formato, prioridad) y queda lista para publicar. Sin LLM. |
| `ENRICH_WITH_LLM` | Zona gris: confianza o fit entre 0,6 y 0,85 | Un LLM (System Two) sugiere ajustes: título alternativo, resumen de 3 puntos, qué corregir. Luego pasa a revisión. |
| `HUMAN_REVIEW` | Confianza < 0,6, tema "Otro" o algún noul de riesgo > 0,7 | Va a la cola del editor con botones **Aprobar excepción / Rechazar**. |
| `REJECT` | Spam o fuera de tema con alta confianza | Se descarta y queda registrado el porqué. |

En la demo la "notificación" al editor es la cola del panel. Una integración con
Slack queda como siguiente paso (fuera de los sistemas de 30X no hay a dónde enviarla).

## KPIs a medir en la demo (hipótesis, no promesas)

| Métrica | Solo LLM | JEV + LLM | Cómo lo medimos |
|---|---|---|---|
| Latencia por pieza | segundos | ~70–500 ms (dato de TypeSafe) | Medida real en cada llamada |
| Costo por 1.000 piezas | depende del LLM | ~USD 0,02–0,05 | Tokens de entrada × USD 0,042/M |
| Respuestas con formato inválido | posibles | 0 (salida tipada) | Conteo de errores de parseo |
| % automático (STP) | 0 % | meta 70–80 % | Rutas `AUTO_APPROVE` / total |

Solo vamos a mostrar cifras que el prototipo mida. Nada de casos de terceros sin fuente.

## Revisión del documento de Haron (ProjectHack30x.pdf)

**Lo que tomamos:**
- Las 3–4 rutas con nombre claro y la matriz de condiciones.
- El LLM en la zona gris para enriquecer (resumen, título alternativo, highlights).
- Botones "Aprobar excepción / Rechazar" en la cola del editor.
- Widget de KPIs (latencia, costo, % automático) y tarjeta de decisión con badges.
- El simulador de feed como pantalla principal de la demo.

**Lo que cambiamos y por qué:**
- **Fuentes:** Sanity "100 % sin errores", Markana Media y Pluris AI no aparecen en
  ninguna fuente pública; no los usamos. El paper arXiv:2409.03219 existe
  (*Content Moderation by LLM: From Accuracy to Legitimacy*, Tao Huang), pero habla
  de legitimidad en casos fáciles vs. difíciles, no de costos; solo lo citaríamos para eso.
- **Llamada a la API:** el ejemplo usa `context` y un arreglo de `questions`, que no es
  el formato real. Usamos el SDK oficial `@typesafe-ai/sdk` (`state` + `questions` con
  `choice()`, `score()`, `noul()`).
- **Valores por defecto falsos:** si JEV falla, el ejemplo inventa confianza 0,88 y fit 0,94
  y aprueba. Nosotros: si JEV falla, la pieza va a `HUMAN_REVIEW`. Nunca aprobar sin respuesta.
- **Categorías:** agregamos "Otro" y separamos Spam de los temas. "Alto/Viral" pasa a
  "relevancia para la audiencia de 30X": JEV no predice viralidad.
- **Un solo noul de "fit editorial"** mezcla varios juicios; lo dividimos en preguntas
  simples (promocional, promesas exageradas, datos sin fuente, riesgo de marca).
- **Código:** Next.js 16 (no 14), sin `any`, con la estructura por módulos de `AGENTS.md`:
  - `types/jev.ts` → `modules/content-review/domain/`
  - `lib/playbook-rules.ts` → `modules/content-review/domain/` (políticas)
  - `lib/jev-client.ts` → `modules/content-review/infrastructure/jev-client.ts`
  - `components/*` → `modules/content-review/ui/`
  - `app/api/jev/gatekeeper` y `app/api/llm/enrich` → `src/app/api/` (rutas delgadas)
