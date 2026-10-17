# content-review

Bounded context for the editorial gatekeeper: JEV reviews a content piece and the
code decides to approve, request edits, escalate to a person or reject it.

| Layer | Holds | May import |
|---|---|---|
| `domain/` | Entities, value objects and decision policies. Pure TypeScript. | nothing outside `domain/` |
| `application/` | Use cases that orchestrate domain + ports. | `domain/` |
| `infrastructure/` | Adapters: JEV client, data sources, LLM. | `domain/`, `application/`, `shared/` |
| `ui/` | React components for this module. | `domain/` types, `shared/ui` |

Routes in `src/app` stay thin: validate input, call a use case, return the result.
