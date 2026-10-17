# Guía visual: "Soft UI"

Referencia: dashboard limpio con riel oscuro, lienzo blanco redondeado y tarjetas pastel. Menos "dashboard técnico", más producto amable.

## Estructura
- **Riel lateral oscuro** (`bg-rail`, ~80 px, solo íconos con tooltip/aria-label; logo de la marca arriba, ajustes/cerrar sesión abajo). En móvil: barra inferior con íconos.
- **Lienzo blanco** (`bg-surface`, `rounded-[var(--radius-panel)]`) sobre fondo `bg-ground`, con mucho aire (padding 40–48 px en escritorio).
- **Encabezado de página**: título grande en Poppins 400 (36–40 px, dos líneas si hace falta, ej. "Revisa el contenido de tu marca"), subtítulo pequeño gris, a la derecha buscador minimalista (línea inferior) + botón cuadrado negro redondeado con ícono.
- **Pestañas tipo píldora**: seleccionada `bg-pill`, resto texto gris sin fondo (Semana / Mes… → Pendientes / Resueltas, Todas / Aprobado…).

## Tarjetas
- Tres tarjetas destacadas por pantalla como máximo, `rounded-[var(--radius-card)]`:
  1. degradado lila→rosa (`--grad-lilac-*`), 2. degradado aqua (`--grad-aqua-*`), 3. blanca con borde fino.
- Dentro: etiqueta arriba a la izquierda + ícono de línea arriba a la derecha; número grande Poppins 300 (40–48 px) abajo con un dato pequeño al lado ("+3 hoy").
- Lista con elementos de fila: miniatura redondeada (o círculo con inicial en degradado), título, dato a la derecha. **Elemento seleccionado = fila negra (`bg-primary`) con texto blanco y bordes muy redondeados.**

## Lenguaje
- Nada de jerga técnica a la vista: sin "tokens", "confidence", "provider", "ms" en primer plano.
  - "Aprobado automáticamente", "Necesita tu revisión", "Sugerencia de la IA", "Descartado".
  - Confianza → "Seguridad de la decisión: alta / media / baja".
  - Latencia y costo solo en Métricas, redondeados y explicados ("Decide en 0,1 s · menos de 1 centavo por 100 piezas").
- Detalle técnico (probabilidades, modelo, tokens) escondido detrás de "Ver detalle técnico" (colapsado).

## Tipografía y color
- Poppins (300/400/500/600). Mono solo dentro de "Ver detalle técnico".
- Colores de ruta suaves (tokens `approve`, `enrich`, `human`, `reject`); el color de la marca (`--brand`) solo en acentos (logo, botón principal en onboarding), nunca en grandes superficies.
- Sombras: ninguna o muy suave; preferir bordes `line` y degradados.
- Íconos: trazo fino (1.5), inline SVG, sin emoji.
