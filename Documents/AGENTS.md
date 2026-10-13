# AGENTS.md — Ajaia Docs

How AI agents are used on this repo: who owns what, how they hand off, and how their output is checked. Repo rules for any assistant are in [CLAUDE.md](CLAUDE.md).

## How this project was built

The build ran as **parallel agents** coordinated by one lead session. The lead fixed the API contract first (now [API.md](API.md)) so web and API could be built at the same time without waiting on each other.

| Agent | Owns (write access) | Must not touch | Done when |
|---|---|---|---|
| **Lead** | `Documents/`, root files, git, deploy, final review | — | Live URL passes the six core flows |
| **API** | `apps/api/**`, `docker-compose.dev.yml` | `apps/web`, Dockerfiles | `npm run build` + all Jest suites green against real Postgres |
| **Web** | `apps/web/**` (except `Dockerfile`) | `apps/api` | `npm run build` + `npm run lint` green; matches API contract |
| **Infra** | `apps/*/Dockerfile`, `docker-compose.yml`, `scripts/`, `.github/` | app source | VM recon done, compose validated, port reachable |
| **Docs** | `Documents/DESIGN.md`, `SECURITY-ESSENTIALS.md`, `API.md` | code | Consistent with ARCHITECTURE.md |

Rules that made parallel work safe:

- **Disjoint file ownership.** No two agents write the same path.
- **Contract first.** Endpoint shapes, error codes and the editor schema were fixed before code started.
- **No agent commits.** Only the lead runs git, so history stays in small, reviewable commits.
- **Real verification.** Each agent reports command output (build, lint, test summary), not "should work".

## Agent briefs (reusable)

### API agent
- NestJS 11, Prisma 6, Postgres 17, Jest + Supertest.
- Every document/share route → `AccessService.requireAccess()`. No access → 404.
- Content PATCH requires `baseVersion`; conditional update; mismatch → 409 with `currentVersion`.
- Validate content with the Tiptap schema; ≤ 1 MB.
- Tests cover deny paths: stranger 404, grantee delete/share 403, viewer edit 403, stale version 409.

### Web agent
- Next.js 15 App Router, Tailwind v4, Tiptap 3, Radix Dialog, sonner, motion, lucide.
- Only call same-origin `/api/*` through `src/lib/api.ts`.
- Autosave: debounce 1 s, one request in flight, backoff retries, conflict banner, `beforeunload` guard.
- Use [DESIGN.md](DESIGN.md) tokens; keyboard-accessible; honour reduced motion.

### Infra agent
- Separate compose project, network and volume on the shared VM; publish only the web port.
- Multi-stage images, non-root, healthchecks, log rotation, `no-new-privileges`.
- Never stop or modify other apps on the VM.

## Reviewing agent output

1. Read every generated route handler and guard line by line — access logic is never accepted unread.
2. Run the test suites and the six core flows on the live URL.
3. Record anything rejected or changed in `AI_WORKFLOW.md` with the reason.

## Adding a new agent task

1. Name the files it owns and the files it must not touch.
2. Give it the contract to code to (API.md / ARCHITECTURE-ESSENTIALS.md).
3. State a "done when" that is a command with observable output.
4. Keep comments short; no AI attribution in commits.
