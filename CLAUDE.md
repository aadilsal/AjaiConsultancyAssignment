# CLAUDE.md — Ajaia Docs

Guidance for Claude Code (and any AI assistant) working in this repo. Agent roles are in [AGENTS.md](AGENTS.md).

## Read first

1. [ARCHITECTURE-ESSENTIALS.md](Documents/ARCHITECTURE-ESSENTIALS.md) — invariants you must not break.
2. [API.md](Documents/API.md) — the contract between `apps/web` and `apps/api`.
3. [DESIGN.md](Documents/DESIGN.md) — tokens and UI rules for anything visual.
4. [SECURITY-ESSENTIALS.md](Documents/SECURITY-ESSENTIALS.md) — before touching auth, uploads or access.

## Project in one paragraph

Narrow Google-Docs-style editor. Next.js 15 (`apps/web`) proxies `/api/*` to NestJS 11 (`apps/api`), which talks to Postgres 17 via Prisma 6. Documents are Tiptap JSON. Sharing is owner → named user (editor/viewer). Real-time co-editing is out of scope on purpose; saves are optimistic-locked instead.

## Commands

| Task | Command |
|---|---|
| Local DB | `docker compose -f docker-compose.dev.yml up -d` (port 5434) |
| API dev | `cd apps/api && npm run start:dev` |
| Web dev | `cd apps/web && npm run dev` |
| API tests | `cd apps/api && npm test` |
| Web checks | `cd apps/web && npm run lint && npm run build` |
| Migration | `cd apps/api && npx prisma migrate dev --name <change>` |
| Deploy | `bash scripts/deploy.sh` |

## Rules

- **Access:** every document/share route calls `requireAccess()`. No access → 404. Never trust the UI to hide things.
- **Schema parity:** the Tiptap extension config in `apps/api/src/editor/` and `apps/web/src/lib/editor-extensions.ts` must stay identical.
- **Errors:** throw Nest HTTP exceptions with a `code`; the global filter shapes `{error:{code,message}}`. Messages are shown to users — write them for humans.
- **Validation:** DTOs with class-validator. No untyped request bodies.
- **Tests:** a change to access, sharing, saving or import needs a test in `apps/api/test/` that covers the deny path.
- **Comments:** short and to the point, one line where possible. No paragraph comments.
- **TypeScript:** strict, no `any` in app code.
- **UI:** use the DESIGN.md tokens; use Radix / sonner / motion / lucide instead of hand-rolled widgets; respect reduced motion.
- **Secrets:** never commit `.env`; add new variables to the matching `.env.example`.
- **Git:** small, focused commits with plain messages. Do **not** add AI attribution or `Co-Authored-By` lines.
- **Scope:** check the PRD non-goals before adding features. If something is cut, say so in SUBMISSION.md instead of half-building it.
