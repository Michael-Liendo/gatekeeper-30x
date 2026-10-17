# Segmentación de inscritos (idea n.° 1 de 30X)

> "Clusterización dinámica: que cualquier persona que entra (ej. al inscribirse en Luma)
> quede ubicada en un segmento según su perfil y el momento de su empresa, que se
> recalcule cuando cambia su situación, y que el sistema diga qué programa o propuesta
> debería recibir."

Es una **segunda decisión sobre el mismo motor** que ya revisa contenido: JEV (TypeSafe)
como motor principal y OpenAI Decisions como respaldo. JEV juzga; el código cuenta,
compara con umbrales y decide la ruta. Pantalla: **Inscritos** (`/segmentos`).

## Qué decide

Para cada persona que se inscribe:

1. **Programa recomendado**: AI Sales, Inmersión Ejecutiva, Sales Machine, Hardcore AI,
   Achievers o "Sin programa claro".
2. **Segmento**: cargo + madurez en IA + programa, por ejemplo
   `Dueño · IA media · AI Sales`.
3. **Siguiente paso**:
   - **Pasar a un asesor comercial**: tiene programa claro, está lista para una
     conversación comercial y decide en su empresa.
   - **Enviar la propuesta del programa**: tiene programa claro, pero todavía no
     cumple lo anterior.
   - **Nutrir con clases gratis y contenido**: no hay programa claro o el perfil dice
     poco de lo que necesita.
   - **Revisión humana**: la IA no respondió o duda demasiado entre programas.
4. **Recalcular**: si cambia un dato (rol, objetivo, dolor), se vuelve a decidir y se
   muestra el antes y el ahora.

## Qué ve la IA (y qué no)

Solo lo que alguien deja al inscribirse: **rol, país, dolor principal, objetivo
principal, temas de interés, relación con 30X y nivel de información**.

Nunca le enviamos las etiquetas de 30X (**Programa sugerido, Afinidad, Banda de
afinidad**) ni los resultados del CRM (**Estado, Etapa en el CRM, Programa**). Las
usamos solo para medir. Hay una prueba automática que lo verifica sobre 200 perfiles.

Para un inscrito nuevo, el "nivel de información" lo calcula el código: un punto por
cada tema y por cada dato conocido (rol, país, dolor); 3 o más = Media, 5 o más = Alta.

## Preguntas (una sola llamada por persona)

| Clave | Tipo | Pregunta |
|---|---|---|
| `program` | elección | ¿Qué programa de 30X le sirve más ahora mismo? (6 opciones con descripción) |
| `seniority` | escala | ¿Qué tan alto es su cargo y su poder de decisión? Ejecutor / Gerente / Dueño o C-level |
| `ai_maturity` | escala | ¿Qué tan avanzada está en el uso de la IA? Baja / Media / Alta |
| `sales_ready` | sí/no | ¿Está lista para una conversación comercial con un asesor de 30X? |
| `has_context` | sí/no | ¿El perfil da suficiente contexto para entender qué necesita? |

Las descripciones de cada programa salen de leer los perfiles que 30X etiquetó en la
hoja (quién es y qué pide), sin inventar características. Por ejemplo, quien marca
ventas **e** IA suele ir a AI Sales; ventas **sin** IA, a Sales Machine; liderazgo, a
Inmersión Ejecutiva.

## Umbrales (datos, no código)

En `src/modules/segmentation/domain/segment-policy.ts` (`defaultSegmentPolicy`):

| Regla | Valor |
|---|---|
| Seguridad mínima para asignar un programa | **0,30** |
| Por debajo de esto, revisión humana | **0,15** |
| Probabilidad para "lista para un asesor" | **0,50** |
| Cargo "alto" (0 Ejecutor · 1 Gerente · 2 Dueño) | **≥ 1,5** |
| Contexto mínimo antes de proponer | **0,50** |

## Cómo se mide

- **Datos**: `data/perfiles-30x.csv`, 697 perfiles anónimos que compartió 30X.
- **Muestra**: 100 perfiles estratificados por "Programa sugerido", con semilla fija
  (siempre los mismos 100).
- **Acierto**: el programa asignado ("Sin programa claro" cuenta como "Sin programa
  sugerido") coincide con el de 30X. Lo damos sobre todos y aparte solo sobre los
  perfiles a los que 30X sí les sugirió programa.
- **Afinidad**: "lista para un asesor" frente a la banda de afinidad alta o muy alta de 30X.

## Resultados medidos (17 oct 2026)

> **Importante**: esta corrida la respondió **OpenAI Decisions (`gpt-6-luna`), el
> respaldo**, porque el entorno local no tenía clave de JEV. Hay que volver a medir con
> JEV en producción.

| | Resultado |
|---|---|
| Coincide con el programa de 30X (todos) | **56 % (56/100)** |
| Coincide, solo perfiles con programa sugerido | **58 % (42/72)** |
| "Lista para asesor" vs. afinidad alta/muy alta | **71 %** de acuerdo |
| De los marcados listos, con afinidad alta según 30X | **85 % (17/20)** |
| Pasan a un asesor | 6 (los 6 con afinidad alta o muy alta según 30X) |
| Propuesta / Nutrir / Revisión humana | 67 / 27 / 0 |
| Tiempo del lote (16 a la vez) | **~3,4 s** · ~450 ms por persona |
| Costo del lote | **~USD 0,012** por 100 personas |

Acierto por programa sugerido por 30X:

| Programa | Aciertos |
|---|---|
| AI Sales | 27/30 (90 %) |
| Inmersión Ejecutiva | 9/19 (47 %) |
| Sales Machine | 5/15 (33 %) |
| Hardcore AI | 0/5 |
| Achievers | 1/3 |
| Sin programa sugerido | 14/28 (50 %) |

### Cómo llegamos a estos números

- Primera versión de las descripciones: **50 %**. Al reescribirlas con los patrones
  reales de la hoja (ventas + IA, ventas sin IA, liderazgo) subió a **56 %**.
- El umbral de seguridad casi no mueve el acierto (entre 0 y 0,30 da lo mismo; 0,50 baja
  a 55 %). Dejamos 0,30 para que una duda clara no se convierta en propuesta.
- "Lista para asesor" en 0,50 prioriza no hacer perder tiempo al equipo comercial
  (85 % de precisión); en 0,30 marca a más gente (12 %) con 67 % de precisión.

### Límites honestos

- **7 de los 19 perfiles de Inmersión Ejecutiva de la muestra no tienen ningún dato**
  (sin rol, sin temas, objetivo por defecto). 30X los etiquetó por su historia en el
  CRM, que la IA no ve a propósito. Sin ellos, Inmersión acierta 9 de 12.
- Las etiquetas de 30X también se solapan: ~40 perfiles con ventas + IA están marcados
  como Sales Machine y no como AI Sales. Un clasificador que solo mire la combinación
  de temas llegaría a ~65 % sobre la hoja completa; ese es un techo razonable con estos
  datos.
- Hardcore AI y Achievers tienen pocos ejemplos (35 y 21 en toda la hoja) y casi nunca
  se distinguen con los datos de inscripción.
- Medimos contra las etiquetas de 30X, que también son una regla, no la verdad absoluta.

## Cómo reproducir

1. Inicia sesión y abre **Inscritos** → "Segmentar 100 inscritos de ejemplo".
2. Abre "Ver detalle técnico" para el acierto por programa y quién respondió.
3. API: `POST /api/segment/run { "size": 50 | 100 | 200 }` y
   `POST /api/segment/profile { rol, pais, dolor, objetivo, temas, relacion, cambios? }`.

## Medición con JEV en producción (17 oct 2026)

200 perfiles (muestra estratificada, semilla fija), todos respondidos por **JEV `jev-1.13.0`**, 0 fallbacks:

| Métrica | Resultado |
|---|---|
| Coincide con el "programa sugerido" por 30X (todos) | **55,5 %** |
| Coincide, solo donde 30X sugirió un programa | **60 %** |
| AI Sales | **95 %** (58/61) |
| Inmersión Ejecutiva / Sales Machine / Hardcore AI / Achievers | 37 % / 38 % / 20 % / 33 % |
| "Listo para un asesor" coincide con afinidad alta o muy alta | **73 %** |
| De los que marcó listos, afinidad alta según 30X | **88 %** |
| Acciones | Asesor 20 · Propuesta 20 · Nutrir 158 · Revisión humana 2 |
| Latencia promedio por persona | **93 ms** |
| Costo de las 200 decisiones | **USD 0,009** |

Lectura honesta: es una primera iteración sobre perfiles con muy poca información (el 73 %
no declara rol y muchos no declaran dolor). Donde el perfil tiene señal clara (ventas + IA)
acierta 95 %; donde 30X decidió con historial del CRM que el motor no ve, acierta menos.
Lo que más sirve hoy es **a quién llamar primero**: 88 % de precisión al marcar "listo para un asesor".
