# Submission — Ajaia Docs

**Candidate:** Aadil Salman Butt · **Date:** October 13, 2026

## Links

| What | Where |
|---|---|
| Google Drive folder (all materials) | https://drive.google.com/drive/folders/1cOjWThNjE1SjLkQMbp5jC3bRdjEMPveG?usp=sharing |
| **Live app** | **https://docs.51-170-90-86.sslip.io** |
| API docs (Swagger UI) | https://docs.51-170-90-86.sslip.io/api/docs |
| Source code | https://github.com/aadilsal/AjaiConsultancyAssignment |
| Walkthrough video | `<LOOM_LINK>` (also in `VIDEO_URL.txt`) |

## Accounts for reviewing sharing

Seeded on every deploy (idempotent). One-click "Log in as…" buttons are on the landing page and the login page. You can also create your own account at `/register`.

| User | Email | Password | Seeded state | Use it to see |
|---|---|---|---|---|
| Alice (owner) | `alice@ajaia.test` | `demo1234` | Owns "Q4 Planning Notes" (shared with Bob) and "Private Draft" | Create, format, import, share, revoke, delete |
| Bob (collaborator) | `bob@ajaia.test` | `demo1234` | Owns "Bob's Ideas"; has Alice's Q4 doc under *Shared with me* | Editing a shared doc; no Share/Delete buttons |
| Carol (outsider) | `carol@ajaia.test` | `demo1234` | No access to Alice's docs | Paste an Alice doc URL → **Not found**; API → **404** |

Demo passwords are intentionally public.

## 5-minute review script

1. Open the live app → **Log in as Alice** → **New document** → rename it, add a Heading 2, a bullet list and bold text → watch the status chip go to **Saved** → refresh: identical.
2. **Import file** → `samples/product-brief.docx` (in the repo) → headings, lists, bold/italic/underline preserved.
3. In your new doc → **Share** → `bob@ajaia.test` → Bob appears in the access list. Copy the URL.
4. Log out → **Log in as Bob** → the doc is under **Shared with me** ("Shared by Alice") → edit it → Saved. Log back in as Alice → Bob's edit is there.
5. Log in as **Carol** → paste the URL → **Not found**. Open `/api/documents/<id>` → `404`.
6. As Alice → Share → **Remove** Bob → Bob's next refresh drops the doc.

## Run locally

Requirements: Node 22+, Docker.

```bash
git clone https://github.com/aadilsal/AjaiConsultancyAssignment.git && cd AjaiConsultancyAssignment
docker compose -f docker-compose.dev.yml up -d          # Postgres on :5434 (dev + test DBs)

cd apps/api && cp .env.example .env && npm ci
npx prisma migrate deploy && npm run seed && npm run start:dev   # API on :4000

cd ../web && npm ci && npm run dev                        # web on :3000 (second terminal)
```

Open http://localhost:3000 → quick-login. Tests: `cd apps/api && npm test`; E2E: `cd e2e && npm ci && npx playwright install chromium && npm test` (both apps running). Full details in [README.md](README.md).

## What is working

All P0 requirements, verified on the live URL:

- **Accounts:** email + password login, one-click demo logins, simple registration, logout/user switch, route protection (pages redirect, API returns 401).
- **Editing:** Tiptap editor with toolbar + shortcuts (H1–H3, bold, italic, underline, strike, highlight, code, links, alignment, bullet/numbered/check lists, blockquote, code block, divider, undo/redo); toolbar reflects the selection; inline rename (empty rejected, 200-char max).
- **Autosave:** 1 s debounce, flush on blur and tab hide, one save in flight, retry with backoff, visible status, leave-page warning.
- **Persistence:** Tiptap JSON in Postgres `jsonb`, validated against the editor schema on every save; formatting round-trips exactly.
- **Conflict guard (P1):** optimistic locking — a stale save gets `409` and a *Reload latest / Overwrite* modal.
- **Import:** `.docx`, `.md`, `.txt` up to 5 MB → new document with structure preserved; clear limits and specific errors before and after upload.
- **Sharing:** share by email as Editor or Viewer; inline errors for unknown user / self / duplicate; list and revoke; "Owner" / "Shared by X" badges; viewers get a read-only editor.
- **Access control on the server for every request;** no access → `404` (not `403`); grantee delete/share → `403`.
- **Delete (P1)** with confirmation; shares cascade.
- **Dashboard:** "My documents" and "Shared with me", sorted by last edited, owner and time shown, empty states.
- **Quality:** OpenAPI docs, request IDs, structured logs, rate limiting, security headers, HTTPS with Secure cookies, light/dark theme, accessible modals, live zod validation.
- **Tests:** 127 API tests (Jest + Supertest on real Postgres) covering allow *and* deny paths; Playwright specs for all six flows; CI on every push.
- **Deployment:** isolated Docker Compose project on our VM behind HTTPS, seeded, health-checked.

## What is incomplete

- **Real-time co-editing** — intentionally not built. Two people editing at once get a conflict prompt instead of a merge.
- **Password reset, email verification, OAuth** — registration is deliberately minimal.
- **Server-side session revocation** — logout clears the cookie; tokens otherwise expire after 7 days.
- **Live dashboard updates** — newly shared or revoked docs appear on refresh, not instantly.
- **Import fidelity** — images, tables, fonts and colours are dropped by design; PDF is not supported.
- `<E2E_STATUS_NOTE>`

## What I'd build next (2–4 hours)

1. **Version history** (~1.5 h): snapshot on save when the last one is >5 min old; list and restore.
2. **Presence** (~45 min): "Bob is viewing" via a 10 s polling heartbeat — no WebSockets needed.
3. **Comments on text ranges** (~2 h): anchored marks + a side panel.
4. **Import into an existing doc** at the cursor, and drag-and-drop on the dashboard.
5. **Session revocation** (a `sessions` table checked by the auth guard) and password reset.

## Decisions worth knowing

| Decision | Why |
|---|---|
| Tiptap JSON in `jsonb`, validated server-side | Lossless round-trip; no HTML sanitising problem |
| One `getDocumentAccess()` used by every route | The UI can never grant more than the server allows |
| 404 instead of 403 for strangers | Document IDs can't be probed |
| Optimistic locking instead of CRDT | Prevents lost work without days of real-time infrastructure |
| NestJS API + Next.js web, same origin via rewrites | Team stack; no CORS; first-party cookie |
| Own Postgres container on our VM | No external accounts for reviewers; data persists across deploys |

More: [Documents/ARCHITECTURE.md](Documents/ARCHITECTURE.md) · AI usage: [Documents/AI_WORKFLOW.md](Documents/AI_WORKFLOW.md)

## Time log

Built with parallel AI agents coordinated by one lead session (see [AGENTS.md](AGENTS.md)).

| Block | Planned | Actual | Notes |
|---|---|---|---|
| PRD review, scope cuts, contract | 0:20 | 0:25 | Stack revised: NestJS API, own VM |
| Docs: architecture, design, security, API | 0:20 | 0:35 | Written in parallel with code |
| API + tests | 1:00 | ~1:30 | Agent; 127 tests incl. registration and hardening |
| Web app | 1:00 | ~2:00 | Agent; scope grew (theme, modals, toolbar, landing) |
| Infra: Docker, VM, CI, HTTPS | 0:30 | 0:40 | Shared VM: isolated project, HTTPS via existing proxy |
| E2E tests | 0:30 | parallel | Agent |
| Deploy, QA on live URL, video | 0:40 | `<FILL>` | |
| **Total wall-clock** | **~4:00** | `<FILL>` | Several blocks ran concurrently |

## Files in this submission

```
README.md               what it is, live URL, accounts, local setup, tests, deploy, limits
SUBMISSION.md           this file
VIDEO_URL.txt           walkthrough video link
AGENTS.md, CLAUDE.md    AI agent roles and repo rules
Documents/
  PRD.md                product requirements (+ revisions)
  ARCHITECTURE.md       full architecture note
  ARCHITECTURE-ESSENTIALS.md  one-page invariants
  API.md                endpoint reference (Swagger at /api/docs)
  SECURITY-ESSENTIALS.md      threat model, OWASP mapping, known gaps
  DESIGN.md             design system (light + dark)
  AI_WORKFLOW.md        AI tools, what was rejected, how it was verified
apps/api/               NestJS API, Prisma schema/migrations/seed, Jest tests
apps/web/               Next.js web app
e2e/                    Playwright end-to-end tests (+ demo/ walkthrough recorder)
samples/                .docx / .md / .txt files for testing import
docker-compose*.yml, scripts/deploy.sh, .github/workflows/ci.yml
```
