# Ajaia Docs

A deliberately narrow Google-Docs-style editor: rich-text documents with autosave, `.docx` / `.md` / `.txt` import, and owner-controlled sharing — built with Next.js, NestJS and PostgreSQL.

| | |
|---|---|
| **Live app** | **https://docs.51-170-90-86.sslip.io** |
| **API docs (Swagger)** | https://docs.51-170-90-86.sslip.io/api/docs |
| **Source** | https://github.com/aadilsal/AjaiConsultancyAssignment |
| **Submission notes** | [SUBMISSION.md](SUBMISSION.md) |

> "Write a doc, bring in an existing file, hand it to a teammate — and nothing gets lost."

## Try it in 2 minutes

Open the live app and use a one-click demo account (or create your own account on `/register`).

| Account | Email | Password | Shows |
|---|---|---|---|
| **Alice** — owner | `alice@ajaia.test` | `demo1234` | Create, format, import, share, revoke, delete |
| **Bob** — collaborator | `bob@ajaia.test` | `demo1234` | "Shared with me", editing a shared doc, no Share/Delete |
| **Carol** — outsider | `carol@ajaia.test` | `demo1234` | Gets **Not found** on Alice's document URL — and a 404 from the API |

Demo passwords are public on purpose. Sample files for import are in [`samples/`](samples/).

## What it does

- **Rich-text editing** (Tiptap): headings H1–H3, bold, italic, underline, strikethrough, highlight, inline code, links, alignment, bullet / numbered / check lists, blockquote, code block, divider, undo/redo — with a toolbar that reflects the selection, keyboard shortcuts and tooltips.
- **Autosave** 1 s after typing stops, on blur and on tab hide; a status chip shows *Saving… / Saved / Not saved — Retry*. Nothing is lost on refresh.
- **Conflict detection** instead of silent overwrites: every save carries the version it was based on; a stale save gets `409` and a *Reload latest / Overwrite* choice.
- **Import** `.docx`, `.md`, `.txt` (≤ 5 MB) as a new document — headings, lists and emphasis preserved; images and tables dropped by design.
- **Sharing**: the owner shares by email as *Editor* or *Viewer*; grantees see it under **Shared with me**; the owner can revoke at any time. Only owners can share or delete.
- **Server-enforced access** on every request; documents you can't access return **404, not 403**, so IDs can't be probed.
- **Accounts**: seeded demo users plus simple registration. Light/dark theme (follows the system), accessible modals, live form validation.

Real-time co-editing is **out of scope on purpose** — see [Scope](#scope-and-known-limitations).

## Architecture

```
Browser ──HTTPS──▶ Caddy (TLS) ──▶ web: Next.js 15 ──/api/* rewrite──▶ api: NestJS 11 ──Prisma──▶ PostgreSQL 17
```

- One Docker Compose project with its own network and volume; only the web container is reachable, via the reverse proxy.
- Documents are stored as schema-validated **Tiptap JSON** (`jsonb`), never HTML.
- A single access function (`getDocumentAccess`) is the only place permissions are decided.

Details: [ARCHITECTURE.md](Documents/ARCHITECTURE.md) · one-pager: [ARCHITECTURE-ESSENTIALS.md](Documents/ARCHITECTURE-ESSENTIALS.md) · API: [API.md](Documents/API.md) · security: [SECURITY-ESSENTIALS.md](Documents/SECURITY-ESSENTIALS.md) · design system: [DESIGN.md](Documents/DESIGN.md)

## Run locally

Requirements: Node 22+, Docker.

```bash
git clone https://github.com/aadilsal/AjaiConsultancyAssignment.git
cd AjaiConsultancyAssignment

# 1. Postgres (dev + test databases) on localhost:5434
docker compose -f docker-compose.dev.yml up -d

# 2. API on :4000
cd apps/api
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run seed
npm run start:dev

# 3. Web on :3000 (new terminal)
cd apps/web
npm ci
npm run dev
```

Open http://localhost:3000 and use a quick-login button. Swagger is at http://localhost:4000/api/docs.

## Tests

```bash
cd apps/api && npm test          # Jest + Supertest against real Postgres (access, auth, documents, shares, import, health)
cd apps/web && npm run lint && npm run build
cd e2e && npm ci && npx playwright install chromium && npm test   # Playwright: all six core flows (needs both apps running)
```

CI (GitHub Actions) runs the API tests against a Postgres service, plus web lint and build, on every push.

## Deploy

```bash
./scripts/deploy.sh   # builds images locally, ships them to the VM over SSH, runs migrations + idempotent seed, health-checks
```

Production runs as an isolated compose project (`/opt/ajaia-docs`) on an Oracle VM behind the server's existing Caddy, which terminates TLS. Secrets are generated on the VM and never committed. See [docker-compose.yml](docker-compose.yml), [docker-compose.edge.yml](docker-compose.edge.yml).

## Supported uploads

| Type | Preserved | Dropped |
|---|---|---|
| `.docx` | Headings 1–3, paragraphs, bold, italic, underline, bullet and numbered lists | Images, tables, fonts, colours, comments |
| `.md` | Headings, lists, task lists, bold, italic, strike, code, links, blockquotes | Tables (become text), images, raw HTML |
| `.txt` | Paragraphs | — |

Max 5 MB, non-empty. Files are parsed in memory and never stored — only the resulting document is.

## Scope and known limitations

| Cut on purpose | Why | Instead |
|---|---|---|
| Real-time co-editing | Days of work; not required | Async sharing + 409 conflict detection |
| Password reset, email verification, OAuth | Not what is being evaluated | Seeded accounts + simple registration |
| Comments, suggestions, version history | Stretch items | Listed as next steps in SUBMISSION.md |
| Images, tables, fonts, colours | Breadth over depth | The formatting above |
| Public link sharing | A second access model | Share with a named user |
| PDF import | Parsing cost, poor structure | .docx / .md / .txt |

Known limitations: concurrent editors see a conflict prompt rather than a merge; logout clears the cookie but there is no server-side session revocation; the dashboard updates on refresh, not live.

## Project docs

| Doc | What's in it |
|---|---|
| [SUBMISSION.md](SUBMISSION.md) | Live URL, credentials, what works / what's incomplete / next steps, time log |
| [Documents/PRD.md](Documents/PRD.md) | Product requirements and the decisions that revised them |
| [Documents/AI_WORKFLOW.md](Documents/AI_WORKFLOW.md) | How AI was used, what was rejected, how it was verified |
| [CLAUDE.md](CLAUDE.md) · [AGENTS.md](AGENTS.md) | Rules and roles for AI assistants working in this repo |
