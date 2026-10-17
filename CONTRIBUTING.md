# Cómo trabajamos

1. **Una rama por tarea**, desde `main`: `feat/<algo>`, `fix/<algo>`.
2. **Commits en inglés** con Conventional Commits (ver [`AGENTS.md`](AGENTS.md)).
3. Antes de subir: `npm run check` (o `pnpm check`).
4. **PR a `main`**; el CI (lint + typecheck + build, con npm y con pnpm) debe pasar. Merge con squash.
5. Para no pisarnos: cada uno trabaja en su carpeta.
   - Backend/JEV/reglas → `src/modules/*/domain|application|infrastructure`, `src/app/api`.
   - Panel → `src/modules/*/ui`, `src/shared/ui`, páginas de `src/app`.
6. **npm o pnpm, los dos sirven.** Al agregar o quitar una dependencia, actualiza **los dos** lockfiles y comitea ambos:
   ```bash
   npm install <paquete>   # actualiza package.json + package-lock.json
   pnpm install            # sincroniza pnpm-lock.yaml
   ```
   Si no tienes pnpm, avisa en el PR y el otro lo sincroniza. El CI falla si los lockfiles no coinciden. Nada de yarn.
