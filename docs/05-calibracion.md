# Calibración de umbrales con JEV real

**Fecha:** 17 oct 2026 · **Modelo:** `jev-1.13.0` (TypeSafe) · **Datos:** las 45 piezas simuladas con ruta esperada ([04-dataset.md](04-dataset.md)).

## Qué medimos

Corrimos las 45 piezas por JEV en producción y probamos combinaciones de umbrales
sobre las mismas respuestas (sin volver a llamar al modelo). Regla dura: **ninguna
pieza riesgosa o spam puede aprobarse sola**.

| | Política inicial (diseño) | Política calibrada |
|---|---|---|
| Confianza para aprobar solo | 0,85 | **0,50** |
| Piso de zona gris | 0,60 | **0,20** |
| Bloqueo por riesgo | 0,70 | **0,60** |
| Umbral de spam | 0,85 | **0,60** |
| Puntaje editorial mínimo | 0,75 | **0,50** |
| Umbral de alerta | 0,50 | 0,50 |
| **Coincide con la ruta esperada** | 53 % (24/45) | **82 % (37/45)** |
| **Resuelto sin persona** | 18 % | **40 %** |
| Riesgos aprobados solos | 0 | **0** |

- Latencia promedio: **~100 ms** por pieza. Costo: **~USD 0,046 por 1.000 piezas**.
- 45/45 respondidas por JEV, 0 fallbacks a OpenAI.
- Los 8 desaciertos son todos **conservadores**: 5 piezas buenas van a "Ajustar con IA" en vez de aprobarse, 1 de zona gris va a revisión humana, 2 spam van a revisión humana en vez de descartarse.

## Corridas posteriores en producción

Con la política calibrada y las preguntas ya adaptadas a cada marca, dos corridas
completas de las 45 piezas dieron **80 %** (36/45) y **87 %** (39/45) de coincidencia,
siempre con 0 piezas riesgosas aprobadas solas. JEV no es determinista al 100 %, por
eso reportamos el rango **80–87 %**.

## Corrida del 17 oct (tarde): con imágenes y preguntas por marca

Las 45 piezas ahora llevan imagen y las preguntas se adaptan a la marca (más
"Potencial de alcance" y "Línea editorial", informativas). Con la misma política:

| Coincide con lo esperado | Sin persona | Riesgos aprobados solos | Latencia promedio | Fallbacks |
|---|---|---|---|---|
| **80 % (36/45)** | **42 %** | **0** | ~0,3 s (con imagen) | 0 |

La búsqueda de umbrales encontró como máximo 82 % (un acierto más), así que no
cambiamos la política para no sobreajustar a 45 piezas. Todas las cifras son sobre
**45 piezas simuladas etiquetadas por el equipo**, no sobre datos reales de 30X.

## Por qué bajaron los umbrales de confianza

La `confidence` que JEV devuelve en preguntas `choice` y `score` es más baja que la
probabilidad de la opción elegida (ej.: tema "ventas" con probabilidad 0,57 y
confianza 0,35, acertando). Exigir 0,85 en todas las respuestas mandaba a revisión
humana piezas que JEV había entendido bien.

## Capturas

Probado en producción con dos capturas PNG simuladas (sin texto): spam → **Descartado** en 187 ms;
post de ventas → tema "ventas", todas las alertas < 0,15. JEV acepta imágenes con `jev-latest`.

## Próximo paso

Recalibrar con piezas reales etiquetadas por el editor (cada "Aprobar excepción" o
"Rechazar" en la Bandeja es una etiqueta nueva).

## Prueba de escala (producción, 17 oct 2026)

1.000 decisiones reales de contenido (solo texto) contra JEV `jev-1.13.0`, concurrencia 32:

| Total | Decisiones por segundo | p50 | p95 | Costo total | Proveedor |
|---|---|---|---|---|---|
| **4,5 s** | **222** | **128 ms** | **250 ms** | **USD 0,06** | JEV 1.000 / 0 fallbacks |

Proyección con lo medido: a 222 decisiones por segundo, ~19 millones de decisiones al día
por ~USD 1.150; o, más realista para 30X, 10.000 piezas al día por ~USD 0,60.
