# Contrato: espacio de equipo (CRM liviano) y regeneración con IA

Tipos: `src/modules/workspace/domain/workspace.ts` (`WorkspacePiece`, `PieceStatus`, `PieceEvent`, `TeamRole`, `RegenerationProposal`, `STATUS_FROM_ROUTE`).

## Alcance (versión liviana)
- Cada persona entra con su email y trabaja sobre **su** marca (sin invitaciones ni equipos compartidos).
- Las piezas que sube quedan guardadas en SQLite con autor, rol, estado, revisión de JEV, versiones e historial.
- El ejemplo de 45 piezas de 30X sigue en el navegador como antes (Bandeja de demo).

## Estados
`in_review` (Por revisar) · `needs_changes` (Por mejorar) · `approved` (Aprobado) · `rejected` (Rechazado).
Al revisar con JEV: AUTO_APPROVE→approved, ENRICH_WITH_LLM→needs_changes, HUMAN_REVIEW→in_review, REJECT→rejected. El editor puede moverla a cualquier estado.

## Persistencia (owner: backend CRM)
- Tablas nuevas: `pieces` (una fila por pieza, versión actual), `piece_events` (historial). `users` gana `role` (default `other`).
- Capturas: archivo en `${DATA_DIR}/uploads/<pieceId>-v<version>.<png|jpg>`, servido por `GET /api/pieces/[id]/image` (solo el dueño).

## API
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/api/pieces` | `?status=` opcional | `WorkspacePiece[]` del usuario, más recientes primero |
| POST | `/api/pieces` | `{ title?, body?, format, channel, imageDataUrl? }` | `WorkspacePiece` (revisada por JEV con la marca del usuario) |
| GET | `/api/pieces/[id]` | — | `{ piece: WorkspacePiece, events: PieceEvent[] }` |
| PATCH | `/api/pieces/[id]` | `{ status, note? }` | `WorkspacePiece` (+ evento `status_changed`) |
| POST | `/api/pieces/[id]/versions` | `{ title, body, changes?: string[] }` | `WorkspacePiece` (nueva versión, re-revisada por JEV, + evento `version_saved`) |
| GET | `/api/pieces/[id]/image` | — | la captura |
| POST | `/api/pieces/examples` | — | `{ created }`: carga 12 piezas de ejemplo (4 aprobadas, 3 por mejorar, 3 por revisar, 2 rechazadas según el dataset), revisadas por JEV con la marca del usuario. Idempotente |
| DELETE | `/api/pieces/examples` | — | `{ removed }`: borra las piezas de ejemplo con su historial e imágenes |
| POST | `/api/regenerate` | `{ pieceId }` **o** `{ title, body, format, channel, imageDataUrl? }` | `RegenerationProposal` (no guarda nada) |
| PATCH | `/api/me` | `{ role }` | `{ user }` |

`UserAccount` gana `role: TeamRole`. `WorkspacePiece` gana `isExample` (columna `pieces.sample_id`). El primer `PUT /api/brand` de alguien sin piezas carga los ejemplos automáticamente. Errores `{ error }` en español; 401 sin sesión; 404 si la pieza no es del usuario.

## Regenerar con IA (owner: agente de regeneración)
1. Toma la pieza, la marca del usuario y lo que JEV marcó (razones + respuestas).
2. Un LLM (OpenAI, `OPENAI_LLM_MODEL`) reescribe título y texto **con la voz de la marca**, corrigiendo solo lo marcado, sin inventar datos (si había datos sin fuente: los quita o pide la fuente con `[FUENTE]`), sin ofrecer lo que la marca no vende.
3. JEV revisa la versión nueva con las mismas preguntas → la propuesta trae su veredicto.
4. La UI muestra antes/después + veredicto nuevo; "Guardar como nueva versión" llama a `POST /api/pieces/[id]/versions`.
Capturas: se reescribe el texto y la imagen se rediseña con OpenAI `gpt-image-2` usando los colores de la marca; JEV revisa la versión nueva con la imagen nueva.

## UI (owner: agente de UI)
- `/tablero`: columnas por estado (Por revisar, Por mejorar, Aprobado, Rechazado) con tarjetas (miniatura, título, autor, potencial de alcance); mover con botones/menú (y arrastrar si es simple).
- `/mis-piezas`: lista de lo que subió el usuario con estado y qué le pidieron cambiar.
- `/pieza/[id]`: si el id es de la base → detalle + historial (línea de tiempo) + versiones + "Regenerar con IA". Las piezas de ejemplo (`cp-*`) siguen leyéndose del estado local.
- Nueva pieza envía a `POST /api/pieces` y redirige a `/pieza/[id]`.
- Rol del usuario: selector en "Mi marca" o en el menú de cuenta.
