# Cómo trabajamos

1. **Una rama por tarea**, desde `main`: `feat/<algo>`, `fix/<algo>`.
2. **Commits en inglés** con Conventional Commits (ver [`AGENTS.md`](AGENTS.md)).
3. Antes de subir: `pnpm check`.
4. **PR a `main`**; el CI (lint + typecheck + build) debe pasar. Merge con squash.
5. Para no pisarnos: cada uno trabaja en su carpeta.
   - Backend/JEV/reglas → `src/modules/*/domain|application|infrastructure`, `src/app/api`.
   - Panel → `src/modules/*/ui`, `src/shared/ui`, páginas de `src/app`.
6. Dependencias nuevas solo con `pnpm add` (nunca npm/yarn) y comiteando `pnpm-lock.yaml`.
