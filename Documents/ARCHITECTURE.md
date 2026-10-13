# Architecture

Ajaia Docs is a deliberately narrow Google-Docs-style editor: rich-text documents with autosave, .txt/.md/.docx import, and owner-to-user sharing. This note explains how it is built and why. The one-page version is [ARCHITECTURE-ESSENTIALS.md](ARCHITECTURE-ESSENTIALS.md); the API contract is [API.md](API.md); security is [SECURITY-ESSENTIALS.md](SECURITY-ESSENTIALS.md).

## 1. System overview

```
                       Oracle VM 51.170.90.86 — docker compose project "ajaia-docs"
                      ┌──────────────────────────────────────────────────────────────┐
 Browser              │  network: ajaia_docs_net (isolated from other apps)          │
 ───────              │                                                              │
 Next.js UI  ──HTTP──▶│  web  (Next.js 15, :3000 → host WEB_PORT)                    │
 Tiptap editor        │    • pages: /login, /, /docs/[id]                            │
 same-origin /api/*   │    • rewrites /api/*  ──────────┐                            │
                      │                                 ▼                            │
                      │  api  (NestJS 11, :4000, not published)                      │
                      │    • AuthGuard (JWT cookie) → OriginGuard → Throttler        │
                      │    • ValidationPipe (class-validator DTOs)                   │
                      │    • AccessService.getDocumentAccess()  ◀── every doc route  │
                      │    • Import converter (mammoth / marked → Tiptap JSON)       │
                      │                                 │ Prisma                     │
                      │                                 ▼                            │
                      │  db   (Postgres 17, not published, volume ajaia_docs_pgdata) │
                      └──────────────────────────────────────────────────────────────┘
```

Three containers, one compose project, one private network. Only `web` publishes a port. The browser never talks to the API directly: Next.js rewrites `/api/*` to `http://api:4000/api/*`, so everything is same-origin — no CORS, and the session cookie is a plain first-party cookie.

## 2. Repository layout

```
apps/
  api/            NestJS 11 + Prisma 6 (own package.json, own Dockerfile)
    prisma/       schema.prisma, migrations/, seed.ts
    src/
      auth/       login / logout / me, JWT cookie guard, @Public, @CurrentUser
      access/     AccessService — the single access rule
      documents/  CRUD, conflict-safe PATCH, import endpoint
      shares/     share / list / revoke
      import/     file → HTML → Tiptap JSON converter
      editor/     Tiptap extension list (must match the web app)
      common/     exception filter, origin guard, error DTOs
      health/     /api/health (DB ping)
    test/         Jest + Supertest against a real Postgres
  web/            Next.js 15 App Router (own package.json, own Dockerfile)
    src/app/      /login, /, /docs/[id], not-found, error
    src/components/  Toolbar, SaveStatus, ShareDialog, ImportDialog, …
    src/hooks/useAutosave.ts
    src/lib/      API client, editor extensions
Documents/        PRD, architecture, security, design, API docs, agent guides
docker-compose.yml       production stack (web + api + db)
docker-compose.dev.yml   local Postgres for dev and tests
scripts/deploy.sh        one-command VM deploy
.github/workflows/ci.yml API tests + web lint/build
```

The apps are independent npm packages (no workspaces). Each has its own lockfile and Dockerfile, which keeps images small and lets either app be rebuilt alone.

## 3. Stack and why

| Layer | Choice | Why | Rejected |
|---|---|---|---|
| Frontend | Next.js 15 (App Router, TS strict) | Team standard; file routing, middleware redirects, `standalone` output for a small image | Plain Vite SPA — needs its own static server + proxy |
| Backend | NestJS 11 | Team standard; guards, pipes and filters give one obvious place for auth, validation and errors | Next.js route handlers (PRD default) |
| Editor | Tiptap 3 (ProseMirror) | Real schema, JSON output, shortcuts, active-state API for the toolbar; same schema on the server | Quill, Lexical, raw contenteditable |
| Content | Tiptap JSON in `jsonb` | Lossless round-trip; validated against the schema on save; no HTML sanitizing problem | HTML strings |
| DB | PostgreSQL 17, own container | Relational fit for owner/share joins; persistent volume; no external account | SQLite, Neon (external dependency) |
| ORM | Prisma 6 | Typed queries, migrations, seed script | Raw SQL |
| Auth | Seeded users, bcrypt, HS256 JWT in httpOnly cookie | Real server-side identity; reviewers need no account | OAuth / NextAuth — not what is evaluated |
| Validation | class-validator DTOs + global `ValidationPipe` (whitelist, forbid unknown) | NestJS-native; also feeds the OpenAPI docs | Ad-hoc checks |
| API docs | `@nestjs/swagger` at `/api/docs` | Contract generated from the code it documents | Hand-written only |
| UI kit | Tailwind v4, Radix Dialog, sonner, lucide, motion | Accessible primitives and animation without hand-rolling | Full component library |
| Tests | Jest + Supertest on real Postgres | Tests hit the real SQL, guards and pipes | Mocked Prisma — would not prove access rules |
| Hosting | Docker Compose on our Oracle VM | Infra we own; isolated project/network/volume; no paid dependency | Vercel + Neon (PRD default) |

## 4. Data model

```
users                         documents                       document_shares
──────────────                ─────────────────────────       ─────────────────────────
id uuid PK      ◀──owner_id── id uuid PK            ◀──────── document_id FK (cascade)
email unique                  owner_id FK users               user_id FK users ──▶ users
name                          title varchar(200)              role enum(editor, viewer)
password_hash                 content jsonb  (Tiptap JSON)    created_at
created_at                    version int    (optimistic lock) UNIQUE(document_id, user_id)
                              created_at, updated_at
```

Indexes: `documents(owner_id, updated_at desc)` for "My documents"; `document_shares(user_id)` for "Shared with me". Ownership is a column, not a share row, so a document always has exactly one owner and the owner can never be "un-shared". Imported files are never stored — only the resulting Tiptap JSON.

## 5. The access rule (single source of truth)

```ts
getDocumentAccess(userId, docId): 'owner' | 'editor' | 'viewer' | null
```

`owner` if `documents.owner_id = userId`; else the share row's `role`; else `null`. Every document and share route calls `requireAccess(userId, docId, allowedRoles)`:

| Result | Response |
|---|---|
| `null` — no doc, malformed id, or no access | **404** `NOT_FOUND` |
| has access but role not allowed (editor deletes/shares, viewer edits) | **403** `FORBIDDEN` |
| allowed | proceed |

**Why 404 for strangers:** a 403 would confirm the document exists, letting anyone probe IDs. 404 makes "doesn't exist" and "not yours" indistinguishable. Grantees get 403 for owner-only actions because they already know the document exists.

The UI hides Share, Delete and the toolbar based on the `access` field the API returns, but that is cosmetic — the server re-checks on every request. Revoking a share takes effect on the very next request; nothing is cached.

## 6. Editing, autosave and conflicts

**Schema parity.** Web and API both configure Tiptap with exactly `StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'], HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } })`, `TextAlign.configure({ types: ['heading', 'paragraph'] })`, `Highlight`, `TaskList`, `TaskItem.configure({ nested: true })` (API: `apps/api/src/editor/extensions.ts`). The API validates every save with `schema.nodeFromJSON(content).check()` plus attribute checks the schema does not enforce: link `href` must be http/https/mailto (so `javascript:` is never stored), `textAlign` must be left/center/right/justify, heading level 1–3. Anything else is rejected (400 `INVALID_CONTENT`) instead of stored.

**Autosave state machine (client, `useAutosave`):**

```
 Saved ──edit──▶ Unsaved ──1s debounce / editor blur / tab hidden──▶ Saving
   ▲                                                                  │
   └──────────────── 200 (version = response.version) ◀───────────────┤
                                                                      ├─ network / 5xx ─▶ "Not saved — Retry" (auto 1s, 3s, 10s)
                                                                      ├─ 409 ─▶ conflict banner: Reload latest | Overwrite
                                                                      └─ 413 ─▶ "Document is too large to save"
```

- One save in flight; edits during a save trigger one follow-up save with the latest content.
- Local editor state is never discarded on failure.
- `beforeunload` warns while changes are unsaved or in flight.
- Title renames are separate PATCHes and do not touch `version`.

**Optimistic concurrency (server).** A content PATCH must carry `baseVersion`. The write is one conditional update:

```sql
UPDATE documents SET content = $1, version = version + 1
WHERE id = $2 AND version = $baseVersion
```

Zero rows → **409 `VERSION_CONFLICT`** with `currentVersion`. It is atomic, so two simultaneous saves can never both win, and a stale tab cannot silently overwrite newer content. "Overwrite" is an explicit user choice that re-fetches the current version and saves on top of it.

This is the deliberate replacement for real-time co-editing: async sharing with conflict *detection* instead of CRDT conflict *resolution*.

## 7. File import

```
upload (multipart, ≤ 5 MB, memory only)
  → extension ∈ {.txt, .md, .docx} + MIME sanity check
  → .txt  : paragraphs (HTML-escaped)
    .md   : marked → HTML
    .docx : mammoth → HTML (Heading 1–3 → h1–h3, underline → <u>)
  → jsdom + ProseMirror DOMParser.fromSchema(editor schema) — drops scripts, styles, images, unknown tags
    (GFM task lists mapped to taskList/taskItem; link marks with non-http/https/mailto hrefs stripped)
  → zero content nodes → 422
  → new document owned by the caller, title = filename without extension
```

Everything converges on one path into the editor schema. Imported HTML is never rendered directly, so a hostile file cannot inject script.

Preserved: headings H1–H3, paragraphs, bold, italic, underline, strike, bullet and numbered lists, blockquotes, inline code and code blocks, hard breaks. Dropped: images, tables, fonts, colors, comments, page layout.

## 8. Authentication and session

- Users are seeded (no signup). Passwords are bcrypt hashes; the demo password is public on purpose.
- `POST /api/auth/login` verifies the hash and sets `ajaia_session`: an HS256 JWT `{sub: userId}`, 7-day expiry, signed with `SESSION_SECRET` (≥ 32 chars, validated at boot).
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`; `Secure` is controlled by `COOKIE_SECURE`. The live URL is plain HTTP on a raw IP, so it runs with `COOKIE_SECURE=false`; behind HTTPS it must be `true`.
- A global Nest guard authenticates every route except those marked `@Public()` (login, logout, health, API docs).
- Next.js middleware redirects to `/login` when the cookie is missing — UX only; the API is the authority and returns 401.

## 9. Error contract

Every non-2xx response has one shape:

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "This document changed elsewhere.", "currentVersion": 7 } }
```

A global exception filter produces it for validation errors, HTTP exceptions, upload limits and unknown errors (500 `INTERNAL_ERROR`, generic message). 5xx errors are logged with method, route and document id. Messages are user-ready so the UI shows them inline.

## 10. Deployment

- Compose project `ajaia-docs` in `/opt/ajaia-docs` on the VM, with its own network (`ajaia_docs_net`), volume (`ajaia_docs_pgdata`) and one published port (`WEB_PORT`). It shares nothing with the other apps on the VM.
- Images: multi-stage `node:22-bookworm-slim`, non-root, healthchecks, log rotation, memory limits, `no-new-privileges`.
- API start: `prisma migrate deploy` → idempotent seed → `node dist/main`. Restarts never duplicate seed data.
- Secrets (`POSTGRES_PASSWORD`, `SESSION_SECRET`) are generated on the VM into `.env` on first deploy and never committed.
- `scripts/deploy.sh` pulls `main` and runs `docker compose up -d --build`.
- CI (GitHub Actions): API tests against a Postgres service; web lint + build.

## 11. What was cut and why

| Cut | Why | Instead |
|---|---|---|
| Real-time co-editing | Days of work; not required | Async sharing + 409 conflict detection |
| Signup / OAuth / password reset | Not what is evaluated | Three seeded users with quick-login |
| Comments, suggestions, version history | Stretch in the brief | Listed as next steps |
| Images, tables, fonts, colors | Breadth over depth | Required formats + H1–H3 + undo/redo |
| Folders, search, trash | Dashboard nice-to-haves | Two lists sorted by last edited |
| Public links | A second access model | Share with a named existing user |
| PDF import | Parsing cost, poor structure | .txt, .md, .docx only |
| HTTPS / domain | No domain for this submission | Plain HTTP on the VM IP; documented risk |

## 12. Known limitations

- Served over HTTP, so the session cookie is not `Secure` on the live URL.
- Conflict detection, not merge: concurrent editors see a conflict banner.
- No server-side session revocation; logout clears the cookie and tokens expire after 7 days.
- The dashboard does not live-update; a refresh shows newly shared or revoked documents.
