Nombre del proyecto: Gatekeeper Editorial 30X

---

Gatekeeper Editorial 30X es un filtro editorial donde JEV decide, el LLM corrige y el equipo solo revisa lo que de verdad importa.

EL PROBLEMA
30X produce mucho contenido (posts, guiones, clips, newsletters, miniaturas) y cada vez más con IA. Revisarlo a mano es lento; pasarlo todo por un LLM es caro, tarda segundos y no da un "sí o no" confiable. Y una sola pieza promocional, exagerada o fuera de tono puede dañar la marca.

LA SOLUCIÓN
Una app web donde diseñadores, copywriters y el editor de Media suben cada pieza (una captura, el texto o ambos). JEV la revisa en milisegundos contra la marca y el código la manda a una de cuatro rutas:
- Aprobado: se publica sin que nadie haga nada.
- Mejorar con IA: zona gris; un LLM propone los cambios.
- Revisar: riesgo o poca seguridad; lo decide una persona.
- Descartado: spam o fuera de tema.
Cada decisión explica qué regla falló, por ejemplo "Demasiado promocional (0,91)".

Si una pieza no pasa, "Regenerar con IA" la reescribe con la voz de la marca corrigiendo solo lo que JEV marcó (y redibuja la captura si era una imagen), y JEV vuelve a revisar la versión nueva antes de guardarla. Ejemplo real: una captura de spam salió Descartada; la IA la reescribió con la voz de 30X y la redibujó en el lima de la marca; JEV la aprobó y quedó como Versión 2.

QUÉ DECIDE JEV
JEV no escribe: decide. En una sola llamada responde 12 preguntas tipadas sobre la pieza:
- choice: tema (los temas de la marca + "Otro") y formato.
- score: relevancia para la audiencia, si deja algo accionable y potencial de alcance (solo informativo).
- sí/no con probabilidad: demasiado promocional, promesas exageradas, datos sin fuente, riesgo de marca, ofrece algo que la marca no vende, spam y si encaja con la línea editorial.
Las preguntas se arman con el perfil de cada marca, que la app prellena leyendo su web en el onboarding (pegas 30x.com y listo). JEV también juzga capturas: lee el texto visible y lo que muestran.

UMBRALES (JEV decide, el código calcula)
Contar, sumar y comparar vive en código, nunca dentro de una pregunta:
- Spam ≥ 0,60: se descarta.
- Riesgo de marca, promesas exageradas u oferta que la marca no vende ≥ 0,60: a una persona.
- Seguridad muy baja o tema "Otro": a una persona.
- Seguridad ≥ 0,50, ninguna alerta en rojo y puntaje editorial ≥ 0,50: se aprueba solo.
- Todo lo demás: mejorar con IA.
- Si JEV no responde, nunca se aprueba: va a una persona.
Los umbrales son datos: Media elige entre Estricto, Equilibrado (calibrado) y Flexible, o ajusta cada valor, y los cambios se aplican al instante sin deploy.

QUIÉN LO OPERA
El editor o líder de Media de 30X, desde la Bandeja (solo lo que necesita su ojo), un tablero por estado (Por revisar, Por mejorar, Aprobado, Rechazado) y el historial de cada pieza con versiones. Cada persona del equipo sube sus piezas y ve qué le pidieron cambiar.

RESULTADOS MEDIDOS
Calibramos con JEV real (jev-1.13.0) sobre 45 piezas simuladas de 30X con la ruta esperada etiquetada:
- Coincidencia con la ruta esperada: de 53 % con la política inicial a 82 % con la calibrada (80–87 % en corridas posteriores).
- 40 % resuelto sin que intervenga una persona.
- 0 piezas riesgosas o spam aprobadas solas; todos los desaciertos son conservadores.
- Unos 100–210 ms por pieza.
- Unos USD 0,046 por cada 1.000 piezas.
- Respaldo con OpenAI (gpt-6-luna) si JEV falla o tarda: usado 0 veces.
- Una captura de spam descartada en 187 ms.

CÓMO ESCALA
- Costo y latencia permiten revisar miles de piezas al día por centavos, sin contratar.
- Multimarca: cada cuenta tiene su propio perfil y las preguntas se adaptan solas.
- Cada "aprobar" o "rechazar" del editor es una etiqueta nueva para recalibrar los umbrales.
- El mismo motor (estado + preguntas tipadas + umbrales + acciones) sirve después para leads, alumnos en riesgo o guardrails de agentes: cada decisión nueva es configuración, no código nuevo.

CÓMO ESTÁ HECHO
Next.js 16, TypeScript, DDD liviano. JEV vía @typesafe-ai/sdk detrás de un puerto de decisiones con OpenAI de respaldo. SQLite, Docker y Coolify. Solo datos simulados; los usuarios de la demo son de prueba. Licencia AGPL-3.0.

ENLACES
- Demo: https://gatekeeper-30x.michaelliendo.com
- Repositorio: https://github.com/Michael-Liendo/gatekeeper-30x
- Playbook: https://github.com/Michael-Liendo/gatekeeper-30x/tree/main/docs/playbook
- Video: [VIDEO]

Equipo DevGain: Michael Liendo y Haron Acosta.
