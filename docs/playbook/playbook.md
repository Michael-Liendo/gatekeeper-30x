# Gatekeeper Editorial 30X — playbook de aplicación

> JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa.

**Equipo DevGain** (Michael Liendo, Haron Acosta) · Hackathon 30X, octubre 2026 · Reto 30X: JEV
Demo: <https://gatekeeper-30x.michaelliendo.com> · Código: <https://github.com/Michael-Liendo/gatekeeper-30x> (AGPL-3.0)

---

## 1. La decisión

La IA multiplicó lo que produce el equipo de contenido; nadie multiplicó la revisión. El
cuello de botella pasó de crear a aprobar, y ahí es donde entra JEV.

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
`jev-1.13.0` (TypeSafe): **1.000 decisiones en 4,5 s** (128 ms cada una), con el
mismo criterio en cada pieza. El LLM solo entra donde hay que escribir: la zona gris.

Es la primera de dos decisiones que ya funcionan sobre el mismo motor; la
segunda (¿a qué programa va este inscrito y lo llamamos ya?) está en la sección 6.

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

### Qué cambia en el día de cada equipo

| Equipo | Antes | Con Gatekeeper |
|---|---|---|
| **Media (editor)** | Revisa cada pieza a mano, con criterios que cambian según quién mire. | Solo abre su bandeja: lo riesgoso y lo dudoso. Lo seguro sale solo y con el mismo criterio siempre. |
| **Media (diseño y copy)** | Reescribe a mano lo que el editor devuelve. | La IA arregla solo lo que JEV marcó y JEV lo verifica; el equipo decide si lo guarda. |
| **Comercial** | Revisa inscritos uno a uno para decidir a quién llamar. | La pantalla **Inscritos** dice a quién llamar primero, qué proponer y a quién nutrir, y se recalcula cuando cambia un dato. |
| **Ambos** | Las correcciones se pierden. | Cada decisión humana queda como etiqueta para recalibrar. Nada riesgoso sale solo. |

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

**Escala.** Prueba en producción (17 oct 2026): 1.000 decisiones reales de
contenido contra JEV `jev-1.13.0`, 32 a la vez. Se repite desde **Métricas →
Prueba de escala** o `POST /api/stress`.

| Total | Por segundo | p50 | p95 | Respaldo |
|---:|---:|---:|---:|---:|
| **4,5 s** | **222** | **128 ms** | **250 ms** | 0 de 1.000 |

A ese ritmo, 10.000 piezas de un día se revisan en menos de un minuto: el equipo
nunca espera al filtro.

**Calidad.** Calibrado el 17 oct 2026 con **45 piezas simuladas y etiquetadas**
contra JEV real, probando umbrales sobre las mismas respuestas:

| | Política inicial | **Calibrada** |
|---|---:|---:|
| Coincide con la ruta esperada | 53 % (24/45) | **80–87 % según la corrida** (82 % en la calibración) |
| Resuelto sin persona | 18 % | **40–42 %** |
| Pieza riesgosa o spam aprobada sola | 0 | **0** |

La última corrida ya lleva imagen en las 45 piezas y preguntas adaptadas a la
marca: **80 % (36/45)**, 42 % sin persona, 0 riesgosas aprobadas solas, ~0,3 s por
pieza con imagen. JEV no es 100 % determinista: por eso damos el rango.

| KPI | Valor medido | Cómo se mide |
|---|---|---|
| % automático | 42 % | Aprobado + Descartado / total |
| % a persona o al LLM | 58 % | Revisar + Mejorar con IA / total |
| Acierto vs. decisión esperada | 80–87 % | Ruta de JEV vs. etiqueta |
| Latencia | 128 ms (p95 250 ms) solo texto · ~0,3 s con imagen | Medida en cada llamada |
| Respaldo usado | 0 de 1.000 y 0 de 45 | Conteo de fallbacks |
| Horas que el equipo recupera | — | Piezas resueltas sin persona × minutos por revisión |

**Todos los errores son conservadores:** 5 piezas buenas van a «Mejorar con IA»
en vez de aprobarse, 1 de zona gris va a revisión y 2 spam van a revisión en vez
de descartarse. Ninguna se aprueba de más.

**Cómo mejora:** cada «Aprobar excepción» o «Rechazar» del editor es una
etiqueta nueva. Con piezas reales etiquetadas se recalibran los umbrales.

Capturas: probado en producción con capturas PNG simuladas; una de spam fue
**Descartado** en 187 ms.

## 6. Escala: la segunda decisión ya está construida

El motor no es de contenido: es **estado + preguntas + umbrales + acciones**.
Lo probamos con la idea n.° 1 de 30X, los **inscritos de Luma** (pantalla
**Inscritos**, detalle en [12-segmentacion.md](../12-segmentacion.md)):
**¿a qué programa va este inscrito y lo llamamos ya?**

- **Estado:** solo lo que la persona deja al inscribirse (rol, país, dolor,
  objetivo, temas, relación con 30X). Las etiquetas y el CRM de 30X nunca se le
  envían a JEV: solo sirven para medir.
- **Preguntas (una pasada):** `program` (choice, 5 programas + «Sin programa
  claro») · `seniority` y `ai_maturity` (score) · `sales_ready` y `has_context` (noul).
- **Umbrales → acción:** programa claro + lista + cargo alto → **Pasar a un
  asesor**; programa claro → **Enviar la propuesta**; poco contexto o sin
  programa → **Nutrir con clases gratis**; sin respuesta o duda fuerte →
  **Revisión humana**. Se **recalcula** cuando cambia un dato.

Medido con JEV en producción sobre **200 de los 697 perfiles anónimos** de 30X:

| Coincide con el programa de 30X | Donde 30X sugirió uno | AI Sales | «Listo para un asesor»: precisión | Por persona |
|---:|---:|---:|---:|---:|
| **55,5 %** | 60 % | **95 %** | **88 %** | 93 ms |

Es una **primera iteración** sobre perfiles con muy poca información (el 73 % no
declara su rol) y contra etiquetas de 30X que a veces usan historial del CRM que
JEV no ve. Lo que ya sirve hoy es **a quién llamar primero**.

**Próximos pasos:** recalibrar ambas decisiones con datos reales etiquetados;
sumar **riesgo de abandono** (¿este alumno necesita que alguien lo llame?) y
**guardrails de agentes** (¿esta respuesta puede salir?); integrar con la
publicación y el CRM.

*Todos los datos de la demo son simulados. Ninguna cifra de este playbook es
estimada: todas se midieron con el prototipo.*
