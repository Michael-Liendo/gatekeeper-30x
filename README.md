# Gatekeeper Editorial 30X

> JEV decide, el LLM corrige, y el equipo solo revisa lo que de verdad importa.

Proyecto del equipo **DevGain** para el **Hackathon 30X (oct 2026) · Reto JEV**.
Un filtro editorial que usa [JEV de TypeSafe](https://docs.typesafe.ai) para aprobar,
pedir ajustes, escalar o descartar piezas de contenido de 30X en milisegundos.

- Reto, reglas y entregables: [`docs/01-reto.md`](docs/01-reto.md)
- Diseño (preguntas, umbrales, métricas): [`docs/02-diseno.md`](docs/02-diseno.md)
- Pitch: [`docs/03-pitch.md`](docs/03-pitch.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · `@typesafe-ai/sdk` · zod · Biome · Docker (Coolify).

## Correr en local

Requisitos: Node `>=22.18`. Funciona con **npm** o **pnpm** (los dos lockfiles están en el repo).

```bash
npm install                  # o: pnpm install
cp .env.example .env.local   # pon tu TYPESAFE_API_KEY
npm run dev                  # o: pnpm dev → http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` / `npm run lint:fix` | Biome (lint + formato) |
| `npm run typecheck` | TypeScript |
| `npm run check` | lint + typecheck + build (lo mismo que el CI) |

Con pnpm son los mismos scripts: `pnpm dev`, `pnpm check`, etc.

## Arquitectura

DDD liviano: un módulo por área de negocio (`src/modules/<módulo>`) con capas
`domain` → `application` → `infrastructure` / `ui`. Las rutas de `src/app` solo
validan, llaman un caso de uso y responden. Detalle y reglas en [`AGENTS.md`](AGENTS.md).

## Despliegue (Coolify)

1. Nuevo recurso → repositorio público → **Build Pack: Dockerfile**.
2. Puerto `3000`. Healthcheck: `/api/health`.
3. Variables: `TYPESAFE_API_KEY` y `OPENAI_API_KEY` (los modelos de JEV y OpenAI están fijos en el código).

## Datos

Solo datos simulados. Ningún dato personal real.
