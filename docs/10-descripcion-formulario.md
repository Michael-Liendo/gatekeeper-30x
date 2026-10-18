Nombre del proyecto: Gatekeeper Editorial 30X

---

La IA multiplicó lo que un equipo de contenido produce; nadie multiplicó la revisión. El cuello de botella pasó de crear a aprobar. Gatekeeper le devuelve el tiempo al equipo: JEV decide miles de veces al día, en milisegundos, si cada pieza sale; la IA corrige lo que falló; una persona revisa solo lo que de verdad lo necesita.

LAS DOS DECISIONES
1. Media: ¿esta pieza sale? Cada post, guion, clip o captura, hecho por el equipo o por una IA.
2. Comercial: ¿a qué programa va este inscrito de Luma y lo llamamos ya? Es la idea n.° 1 que propuso 30X.
Hoy las dos se toman a mano: lento, con criterios distintos, y equivocarse cuesta marca o ventas.

ESCALA, MEDIDA EN PRODUCCIÓN
1.000 decisiones reales con JEV (jev-1.13.0) en 4,5 s: 222 por segundo, 128 ms cada una (p95 250 ms) y 0 respaldos. A ese ritmo, 10.000 piezas de un día se revisan en menos de un minuto: el equipo nunca espera al filtro. Se repite en vivo desde Métricas → Prueba de escala.

DECISIÓN 1: ¿ESTA PIEZA SALE?
JEV responde 12 preguntas tipadas en una llamada (tema y formato; relevancia, accionable y alcance; sí/no con probabilidad: promocional, promesas exageradas, datos sin fuente, riesgo de marca, oferta que la marca no vende, spam, línea editorial). Las preguntas se arman con el perfil de la marca, que la app lee de su web (pegas 30x.com). JEV también juzga capturas.
El código aplica los umbrales y elige la ruta:
- Spam ≥ 0,60: se descarta.
- Riesgo de marca, promesas u oferta ajena ≥ 0,60, o poca seguridad: a una persona.
- Seguridad ≥ 0,50, sin alertas y buen puntaje: se aprueba sola.
- Lo demás: mejorar con IA.
- Si JEV no responde, nunca se aprueba.
"Regenerar con IA" reescribe el texto con la voz de la marca y redibuja la imagen; JEV revisa la versión nueva antes de guardarla. Caso real: una captura de spam salió Descartada; la IA la convirtió en una invitación a las clases gratis de 30X, en el lima de la marca; JEV la aprobó como Versión 2.
Medido con 45 piezas simuladas y etiquetadas: 80–87 % de acierto según la corrida (53 % antes de calibrar), 42 % resuelto sin persona, 0 piezas riesgosas aprobadas solas, ~0,3 s con imagen. Todos los errores son conservadores.

DECISIÓN 2: ¿A QUÉ PROGRAMA VA Y LO LLAMAMOS YA?
JEV lee solo lo que la persona deja al inscribirse (rol, país, dolor, objetivo, temas) y decide en una pasada: programa (AI Sales, Inmersión Ejecutiva, Sales Machine, Hardcore AI, Achievers o sin programa claro), cargo, madurez en IA, si está lista para un asesor y si hay contexto suficiente. El código elige la acción: pasar a un asesor, enviar la propuesta, nutrir con clases gratis o revisión humana. Si cambia un dato, se recalcula y se ve el antes y el ahora.
Medido con JEV sobre 200 de los 697 perfiles anónimos que compartió 30X: 55,5 % coincide con el programa que sugiere 30X (60 % donde sugirió uno; 95 % en AI Sales); 88 % de precisión al marcar "listo para un asesor"; 93 ms por persona. Es una primera iteración sobre perfiles muy escasos (el 73 % no declara rol); lo que ya sirve es saber a quién llamar primero.

QUÉ CAMBIA PARA LOS EQUIPOS
- Menos revisión manual: el 42 % se resuelve sin persona; el editor ya no revisa todo, solo lo riesgoso o dudoso.
- Mismo criterio siempre: las reglas de la marca se aplican igual a cada pieza, la haga quien la haga.
- Nada riesgoso sale solo: 0 piezas riesgosas aprobadas solas.
- La IA arregla, el equipo no reescribe: corrige solo lo marcado y JEV lo verifica.
- Comercial llama primero a quien está listo, y la lista se recalcula cuando cambia un dato.
- Cada decisión del editor es una etiqueta para seguir mejorando.

QUIÉN LO OPERA
Media: el editor ve solo su Bandeja (lo riesgoso y lo dudoso), un tablero por estado y el historial con versiones; elige la política (Estricto, Equilibrado o Flexible) sin deploy. Comercial: la pantalla Inscritos dice a quién llamar, qué proponer y a quién nutrir. Cada corrección humana es una etiqueta para recalibrar.

CÓMO ESCALA
El motor es estado + preguntas tipadas + umbrales + acciones. La segunda decisión reutilizó todo; la siguiente (riesgo de abandono, guardrails de agentes) es otro set de preguntas, no otro sistema. Multimarca: cada cuenta tiene su perfil.

CÓMO ESTÁ HECHO
Next.js 16, TypeScript, DDD liviano. JEV vía @typesafe-ai/sdk detrás de un puerto de decisiones, con OpenAI de respaldo (usado 0 veces en las mediciones). SQLite, Docker y Coolify. Solo datos simulados o anónimos. AGPL-3.0.

ENLACES
- Demo: https://gatekeeper-30x.michaelliendo.com
- Repositorio: https://github.com/Michael-Liendo/gatekeeper-30x
- Playbook: https://github.com/Michael-Liendo/gatekeeper-30x/tree/main/docs/playbook
- Video: [VIDEO]

Equipo DevGain: Michael Liendo y Haron Acosta.
