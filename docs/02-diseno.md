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
