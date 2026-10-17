# Contrato: cuentas, marca y onboarding (para el equipo y los agentes)

Tipos: `src/modules/brand/domain/brand-profile.ts` (`BrandProfile`, `BrandProfileInput`, `BrandProfileDraft`, `UserAccount`).

## Persistencia
- SQLite con el módulo nativo `node:sqlite` (sin dependencias nativas). Archivo en `${DATA_DIR:-./data}/gatekeeper.db`.
- En Coolify, `DATA_DIR=/app/data` con volumen persistente.
- Tablas: `users`, `sessions`, `brands` (una marca por usuario en esta versión).

## Funciones de servidor (owner: módulo `accounts`)
- `src/modules/accounts/infrastructure/session.ts`
  - `getCurrentUser(): Promise<UserAccount | null>` — lee la cookie de sesión.
  - `requireUser(): Promise<UserAccount>` — lanza si no hay sesión.
- `src/modules/brand/infrastructure/current-brand.ts`
  - `getCurrentBrand(): Promise<BrandProfile | null>` — marca del usuario de la sesión.
  - `getDefaultBrand(): BrandProfile` — perfil de 30X para el dataset simulado y para sesiones sin marca.

## API
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/auth/sign-in` | `{ email, name? }` | `{ user, isNew }` + cookie `gk_session` (httpOnly, 30 días). Crea el usuario si no existe. |
| POST | `/api/auth/sign-out` | — | `{ ok: true }` |
| GET | `/api/me` | — | `{ user, brand }` (`brand` null si falta onboarding) o 401 |
| POST | `/api/brand/extract` | `{ url }` | `BrandProfileDraft` (scraping + IA) |
| PUT | `/api/brand` | `BrandProfileInput` | `BrandProfile` (crea o actualiza la marca del usuario) |
| GET | `/api/brand` | — | `BrandProfile` o 404 |

Errores: `{ error: string }` en español. 401 sin sesión.

## Rutas de la app
- `/ingresar` — email (+ nombre la primera vez).
- `/bienvenida` — onboarding: 1) pegar links de la marca → "Analizar mi marca", 2) revisar/editar el perfil prellenado (colores con selector), 3) confirmar → Bandeja.
- `/marca` — ajustes de marca (mismo formulario).
- `proxy.ts` (Next 16): sin sesión → `/ingresar`; con sesión y sin marca → `/bienvenida`. `/api/health` y `/api/auth/*` quedan públicos.
