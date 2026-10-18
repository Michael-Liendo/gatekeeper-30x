# Gatekeeper Editorial 30X — pitch

**🎯 Problema**
30X produce mucho contenido (posts, guiones, clips, newsletters), y con IA cada vez más. Revisar pieza por pieza a mano es lento. Cada persona usa su criterio, y el equipo creativo termina revisando en vez de crear.

**💡 Solución**
Un filtro editorial con JEV que **aprueba, corrige o descarta cada pieza en milisegundos**, según las reglas de 30X. El equipo solo revisa los casos dudosos.

**⚙️ Cómo funciona**
1. Entra una pieza.
2. JEV responde preguntas simples: tema, relevancia, si es promocional, si tiene riesgo de marca, si trae datos sin fuente.
3. El código decide según la confianza:
   - **Alta:** se publica.
   - **Media:** un LLM sugiere el ajuste.
   - **Baja:** pasa al editor.

**🤝 Qué cambia para los equipos**
- **Media se enfoca:** deja lo repetitivo y solo decide los casos dudosos, con el porqué de cada alerta.
- **Protege la marca:** nada promocional, exagerado o riesgoso sale sin revisión.
- **La IA corrige, no el equipo:** lo que falló se reescribe con un clic y JEV lo vuelve a revisar.
- **Comercial llama primero a quien está listo** y sabe qué programa ofrecerle.
- **Reglas editables:** Media ajusta su política sin programar.

**👤 Quién lo usa**
El editor o líder de Media de 30X, desde un panel con la cola de casos escalados.

**📊 Cómo se mide**
% aprobado automático · % escalado · precisión validada por el editor · horas que el equipo recupera.

**🚀 Por qué gana**
- Es una de las ideas que 30X pidió.
- JEV decide al instante; el LLM solo escribe donde hace falta; la persona decide lo importante.
- El mismo motor sirve después para leads, alumnos o guardrails de agentes.

> "JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa."
