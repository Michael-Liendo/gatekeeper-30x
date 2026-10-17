# Gatekeeper Editorial 30X — pitch

**🎯 Problema**
30X produce mucho contenido (posts, guiones, clips, newsletters), y con IA cada vez más. Revisar pieza por pieza a mano es lento. Pasar todo por un LLM es caro, lento y no da un "sí o no" confiable.

**💡 Solución**
Un filtro editorial con JEV que **aprueba, corrige o descarta cada pieza en milisegundos**, según las reglas de 30X. El equipo solo revisa los casos dudosos.

**⚙️ Cómo funciona**
1. Entra una pieza.
2. JEV responde preguntas simples: tema, relevancia, si es promocional, si tiene riesgo de marca, si trae datos sin fuente.
3. El código decide según la confianza:
   - **Alta:** se publica.
   - **Media:** un LLM sugiere el ajuste.
   - **Baja:** pasa al editor.

**💰 Valor para 30X**
- **Escala sin contratar:** revisa miles de piezas al día por centavos.
- **Protege la marca:** nada promocional, exagerado o riesgoso sale sin revisión.
- **Ahorra tiempo:** el editor solo ve lo dudoso.
- **Reglas editables:** Media ajusta su política sin programar.

**👤 Quién lo usa**
El editor o líder de Media de 30X, desde un panel con la cola de casos escalados.

**📊 Cómo se mide**
% aprobado automático · % escalado · precisión validada por el editor · costo por pieza · horas ahorradas.

**🚀 Por qué gana**
- Es una de las ideas que 30X pidió.
- Combina JEV (rápido y barato) con un LLM (solo para lo difícil).
- El mismo motor sirve después para leads, alumnos o guardrails de agentes.

> "JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa."
