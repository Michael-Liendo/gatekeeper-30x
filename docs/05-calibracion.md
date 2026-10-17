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
