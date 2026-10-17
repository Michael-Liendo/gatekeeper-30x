# Reto 30X: JEV — reglas y entregables

**Pregunta del reto:** ¿Qué decisiones de 30X podría tomar JEV miles de veces al día, en milisegundos y por fracciones de centavo, y cómo se ve eso funcionando?

- **Hackathon:** Hackathon 30X Octubre 2026 · Hub Caracas (Wave Tech Hub) sáb 17 oct, 9:00–17:00
- **Equipo:** DevGain (Michael Liendo, Haron Acosta)
- **Cierre de entrega:** **dom 18 oct, 12:00 p. m.** (se puede reenviar hasta el cierre)
- **Mentoría de pitch:** sáb 17 oct, 3:00–6:00 p. m. (Zoom)

## Entregables del reto
1. **Playbook** (máx. 5 páginas u 8 slides): decisiones que toma JEV, esquema de preguntas tipadas, umbrales (cuándo actúa solo, cuándo a un LLM, cuándo a una persona), quién lo opera y cómo se mide.
2. **Prototipo funcional** con repositorio público.

## Formulario de HackRadar (todo obligatorio)
- [ ] Nombre del proyecto
- [ ] Reto: "Reto 30X: JEV"
- [ ] Descripción (máx. 5.000 caracteres)
- [ ] Repositorio público de GitHub con README (app, flujos y arquitectura)
- [ ] Video demo (URL)
- [ ] Demo en línea (URL)

## Reglas
- ✅ Área Comercial, Media o Tech de 30X.
- ✅ Solo datos simulados o públicos. Nada de datos personales reales.
- ✅ Debe correr fuera de los sistemas de 30X.
- ❌ Clones de personas de 30X.
- ❌ Suponer que 30X vende algo que no vende.

## Lo que probablemente evalúan (no hay rúbrica publicada)
1. Decisión real y frecuente en 30X.
2. Buen uso de JEV: preguntas simples combinadas en código, opción "otro", umbrales, camino a una persona.
3. Respeta límites de JEV: contar, aritmética y fechas van en código.
4. Aplicable a 30X: productos reales y quién lo opera.
5. Medible: precisión, % automático, % escalado, costo, latencia.
6. Prototipo que funciona y se entiende en el video.

## JEV en corto
- Modelo "System One" de TypeSafe: no escribe, **decide**.
- Recibe un `state` (texto o JSON) y preguntas tipadas: `choice` (hasta 255 opciones), `score` (escala ordenada), `noul` (sí/no con probabilidad 0–1). También `box` para imágenes.
- 70–500 ms · USD 0,042 por millón de tokens de entrada · salida gratis · contexto 32K.
- API: `POST https://api.typesafe.ai/v1/systemone`, modelo `jev-latest`. SDK: `@typesafe-ai/sdk` (lee `TYPESAFE_API_KEY`).
- Docs: https://docs.typesafe.ai · patrones: composite scoring, confidence routing, fan-out, intent routing.

## 30X en corto
Escuela de negocios para fundadores y ejecutivos de Latinoamérica ("alternativa moderna al MBA"). Vende Inmersiones Ejecutivas presenciales de 3 días, programas de Ventas, Growth e IA, y tiene clases gratis, comunidad, mentores y partners. Fuente: https://30x.com
