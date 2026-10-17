# Gatekeeper Editorial 30X — playbook de aplicación

> JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa.

**Equipo DevGain** (Michael Liendo, Haron Acosta) · Hackathon 30X, octubre 2026 · Reto 30X: JEV
Demo: <https://gatekeeper-30x.michaelliendo.com> · Código: <https://github.com/Michael-Liendo/gatekeeper-30x> (AGPL-3.0)

---

## 1. La decisión

Cada pieza que produce 30X Media, la haga el equipo creativo o una IA (posts,
guiones, clips, newsletters, capturas PNG/JPG), pasa por una sola pregunta:
**¿esta pieza sale?** JEV la responde miles de veces al día con una de cuatro rutas:

| Ruta | Qué pasa |
|---|---|
| **Aprobado** | Lista para publicar, etiquetada por tema y formato. Nadie la toca. |
| **Mejorar con IA** | Zona gris: un LLM propone el arreglo y JEV lo vuelve a revisar. |
| **Revisar** | Riesgo o duda real: decide el editor de Media. |
| **Descartado** | Spam o fuera de la marca. Queda registrado el porqué. |

**Por qué JEV y no un LLM.** JEV no escribe, decide: devuelve probabilidades
tipadas, no texto libre que haya que interpretar. Medido en producción con
`jev-1.13.0` (TypeSafe): **~100–210 ms por pieza** y **~USD 0,046 por 1.000
piezas** (USD 0,042 por millón de tokens de entrada, salida gratis). El LLM solo
entra donde hay que escribir: la zona gris.

## 2. Esquema de preguntas

Doce preguntas simples, contestadas en **una sola pasada**. Cada una pide un
único juicio observable.

| Clave | Tipo | Qué mide |
|---|---|---|
| `topic` | choice | Tema principal entre los de la marca, u «Otro» |
| `format` | choice | Post, guion, clip, newsletter u otro |
| `relevance` | score | Relevancia para su audiencia: baja · media · alta |
| `actionable` | score | ¿Deja algo aplicable? nada · algo · mucho |
| `too_promotional` | noul | ¿Vende más de lo que aporta? |
| `exaggerated_promises` | noul | ¿Promete resultados garantizados o exagerados? |
| `unsourced_claims` | noul | ¿Cifras o estudios sin fuente? |
| `brand_risk` | noul | ¿Toca temas prohibidos, ataca a alguien o rompe el tono? |
| `offers_unsold_product` | noul | ¿Ofrece algo que la marca no vende? |
| `is_spam` | noul | ¿Spam, enlaces sospechosos o sin relación con el negocio? |
| `reach_potential` | score | *Informativa:* potencial de alcance bajo · medio · alto |
| `editorial_fit` | noul | *Informativa:* ¿encaja con la línea editorial? |

- **Hechas a la medida de cada marca.** En el onboarding se lee la web de la
  marca y se sacan sus ofertas, su audiencia, su tono, sus temas y los temas que
  nunca publica. Esas listas entran en las instrucciones (p. ej. «30X vende solo:
  Inmersión Ejecutiva, Programa de Ventas…»).
- **Las dos informativas** ayudan al editor a priorizar y **nunca cambian la ruta**.
- **JEV no cuenta ni calcula.** El código combina las respuestas (composite scoring):

  `puntaje editorial = 0,5·relevancia + 0,5·accionable − 0,5·P(promocional) − 0,5·P(sin fuente)`

  Los pesos son datos que el equipo puede ajustar.

## 3. Umbrales y rutas

Las reglas se aplican **en este orden**; la primera que se cumple decide, y todas
las que se cumplen se muestran como «porqué» (ej. «Spam (0,81)»):

1. Falta alguna respuesta (JEV y el respaldo fallaron) → **Revisar**
2. Spam ≥ 0,60, o tema «Otro» con confianza ≥ 0,50 y spam ≥ 0,50 → **Descartado**
3. Riesgo de marca, promesas exageradas u oferta ajena ≥ 0,60 → **Revisar**
4. Confianza mínima < 0,20, o tema «Otro» → **Revisar**
5. Todas las confianzas ≥ 0,50, ninguna alerta ≥ 0,50 y puntaje ≥ 0,50 → **Aprobado**
6. Todo lo demás (zona gris) → **Mejorar con IA** (aquí entra el LLM)

En resumen: **actúa sola** en 2 y 5, **pasa al LLM** en 6 y **pasa a una persona**
en 1, 3 y 4.

Los umbrales son datos, no código. El equipo elige un preajuste o mueve cada
número desde el panel, sin desplegar:

| Umbral | Estricto | **Equilibrado** (calibrado) | Flexible |
|---|---:|---:|---:|
| Confianza para aprobar | 0,65 | **0,50** | 0,40 |
| Piso de zona gris | 0,30 | **0,20** | 0,15 |
| Bloqueo por riesgo | 0,45 | **0,60** | 0,70 |
| Spam | 0,50 | **0,60** | 0,70 |
| Puntaje editorial mínimo | 0,60 | **0,50** | 0,40 |
| Alerta (sí/no en rojo) | 0,40 | **0,50** | 0,60 |

**Nunca se aprueba sin respuesta.** Si JEV falla o no contesta en 4 s, decide el
respaldo (OpenAI Decisions API, `gpt-6-luna`). Si ambos fallan, la pieza va a
**Revisar**. En las pruebas: 0 respaldos usados.

## 4. Quién lo opera

| Quién | Qué hace |
|---|---|
| **Diseño y Copy** | Suben la pieza: captura PNG/JPG o texto. |
| **JEV** | Decide la ruta con las reglas de la marca. Lee las capturas como parte de la pieza. |
| **IA (LLM)** | Propone el arreglo: reescribe el texto con la voz de la marca y redibuja la imagen. JEV verifica la versión nueva. |
| **Editor de Media** | Solo ve su bandeja (lo riesgoso y lo dudoso): **Aprobar excepción** o **Rechazar**. |
| **El equipo** | Ajusta la política: preajuste o umbral por umbral, sin programar. |

Todo vive en un **tablero del equipo** con columnas Por revisar · Por mejorar ·
Aprobado · Rechazado, y cada pieza guarda autor, rol, versiones e historial.

### El ciclo «detecta → arregla → verifica» (caso real)

1. **Detecta.** Se subió una captura de spam: «GANA $5.000 AL DÍA… cripto…
   garantizado». JEV: **Descartado** — Spam 0,81 · Riesgo de marca 0,95 ·
   Promesas exageradas 0,98.
2. **Arregla.** «Regenerar con IA»: `gpt-6-luna` reescribió el copy con la voz de
   30X y `gpt-image-2` redibujó la imagen en el lima de la marca, corrigiendo solo
   lo marcado y sin inventar datos.
3. **Verifica.** JEV revisó la versión nueva con las mismas 12 preguntas:
   **Aprobado**.
4. **Guarda.** Quedó como **Versión 2**, con el historial completo.

## 5. Cómo se mide

Calibrado el 17 oct 2026 con **45 piezas simuladas y etiquetadas** contra JEV real
(`jev-1.13.0`), probando umbrales sobre las mismas respuestas:

| | Política inicial | **Calibrada** |
|---|---:|---:|
| Coincide con la ruta esperada | 53 % (24/45) | **82 % (37/45)** · corridas posteriores 80–87 % |
| Resuelto sin persona | 18 % | **40 %** |
| Pieza riesgosa o spam aprobada sola | 0 | **0** |

| KPI | Valor medido | Cómo se mide |
|---|---|---|
| % automático | 40 % | Aprobado + Descartado / total |
| % a persona o al LLM | 60 % | Revisar + Mejorar con IA / total |
| Acierto vs. decisión esperada | 82 % (80–87 %) | Ruta de JEV vs. etiqueta |
| Latencia | ~100–210 ms por pieza | Medida en cada llamada |
| Costo | ~USD 0,046 por 1.000 piezas | Tokens de entrada × USD 0,042/M |
| Respaldo usado | 0 en 45/45 | Conteo de fallbacks |
| Horas ahorradas | — | Piezas resueltas sin persona × minutos por revisión |

**Todos los errores son conservadores:** 5 piezas buenas van a «Mejorar con IA»
en vez de aprobarse, 1 de zona gris va a revisión y 2 spam van a revisión en vez
de descartarse. Ninguna se aprueba de más.

**Cómo mejora:** cada «Aprobar excepción» o «Rechazar» del editor es una
etiqueta nueva. Con piezas reales etiquetadas se recalibran los umbrales.

Capturas: probado en producción con capturas PNG simuladas; una de spam fue
**Descartado** en 187 ms.

## 6. Escala y próximos pasos

El motor no es de contenido: es **estado + preguntas + umbrales + acciones**.
Otra decisión de 30X es un set de preguntas nuevo con sus umbrales, sin código
nuevo:

- **Clusterización de inscritos:** ¿qué programa le sirve a cada inscrito?
- **Riesgo de abandono:** ¿este alumno necesita que alguien lo llame?
- **Guardrails de agentes:** ¿esta respuesta del agente puede salir?

**Próximos pasos:** recalibrar con piezas reales etiquetadas por el editor,
invitar a todo el equipo a una misma marca e integrarlo con la publicación.

*Todos los datos de la demo son simulados. Ninguna cifra de este playbook es
estimada: todas se midieron con el prototipo.*
