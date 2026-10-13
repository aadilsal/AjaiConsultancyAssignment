# Ajaia Docs — PRD

Oct 13, 2026 · @Aadil Salman Butt

> **Revisions (Oct 13, 2026, before coding started).** These replace the matching parts of the original PRD below; everything else stands as written.
>
> | Area | Original PRD | Decision | Why |
> |---|---|---|---|
> | Backend | Next.js route handlers | **NestJS 11** API (`apps/api`) + **Next.js 15** frontend (`apps/web`) | Team standard: Next.js + TypeScript frontend, NestJS backend |
> | Hosting | Vercel + Neon | **Own Oracle VM** (51.170.90.86), isolated Docker Compose project with its **own Postgres 17 container** | Infra we already run; no third-party accounts for reviewers; isolated from other apps on the VM |
> | Live URL | HTTPS Vercel URL | `http://51.170.90.86:<port>` (raw IP, HTTP) | No domain for this submission; the session cookie `Secure` flag is configurable and documented |
> | Tests | Vitest | **Jest + Supertest** (NestJS default) | Zero-config with Nest decorators; same test plan |
> | Validation | Zod | **class-validator DTOs + global `ValidationPipe`** | NestJS-native; same "one schema per endpoint" idea |
> | API docs | — | **OpenAPI / Swagger UI at `/api/docs`** + [API.md](API.md) | Reviewers can explore the contract without reading code |
> | Real auth | Seeded users only (signup cut) | **`POST /api/auth/register`** (name, email, password) + seeded demo users | Simple email+password registration added at the user's request; no email verification, reset or OAuth |
> | Timebox | 4–6 h | **~1–2 h build**, built in parallel; the rest on docs and video | Video and written judgment carry most of the grade |
>
> See [ARCHITECTURE.md](ARCHITECTURE.md) for the resulting design.

Ship a deliberately narrow Google-Docs-style editor in 4–6 hours: rich-text docs with autosave, .txt/.md/.docx import, owner-to-user sharing with clear owned vs shared views, Postgres persistence, one live URL and tests on the access logic. Depth goes into editing, sharing correctness and a clean reviewer experience; real-time collaboration is cut on purpose.

## Assignment analysis

The build is the vehicle; the grade is mostly judgment. Half of the nine evaluation criteria are about prioritization, communication and AI maturity, not code volume. A reviewer will likely spend 15–30 minutes: open the live URL, log in as two seeded users, share a doc, skim the README and notes, watch the video.

### What they are actually testing

| Signal | What a strong submission shows | What a weak one shows |
|---|---|---|
| Product judgment | A named, coherent slice with explicit cuts and reasons | Many half-working features |
| Full stack execution | Editor, API, DB and access checks all working end to end | Pretty UI over localStorage, or access checks only in the UI |
| Editing quality | Toolbar state reflects selection, autosave with visible status, no lost work | Raw contenteditable, a Save button that is easy to forget |
| Upload | A product-relevant flow (file becomes a doc) with stated limits | A file picker that stores bytes nobody sees |
| Sharing | Server-enforced owner/grantee rules, clear Owned vs Shared views | A share button that only hides UI |
| Infra judgment | One-click live URL, seeded data, free tier, no paid dependency | "Runs locally only", or reviewer must sign up for a service |
| Delivery discipline | Small commits, tests, README that works on first try | Monolith commit, no tests |
| Communication | Honest "working / incomplete / next" lists | Overclaiming |
| AI maturity | Concrete examples of AI output rejected and why, plus how it was verified | "I used Copilot for everything" |

### Reading between the lines

- **"Ambiguous scope, multiple surfaces"** means they want to see you choose. Write the cuts down before coding and repeat them in the README, architecture note and video.
- **"Collaborative" is a trap word.** The required tasks never ask for real-time co-editing; it only appears as a stretch item. Building CRDT/WebSocket sync would burn the timebox. Say clearly that collaboration here means async sharing.
- **"At least one meaningful automated test"** means a test on logic that matters (who can read or edit a doc), not a snapshot of a button.
- **"Do not require reviewers to pay"** rules out anything behind a paid tier and argues against making reviewers create accounts. Seeded logins printed on the login page remove friction.
- **The 4–6 hour limit is itself graded.** Keep a short time log; a focused partial build with honest notes beats an overbuilt one.

### Traps to avoid

- Building custom rich text on raw contenteditable instead of using an editor library.
- Storing content as HTML strings without a schema (hard to sanitize, easy to break formatting).
- SQLite on a serverless host, where the file resets on each deploy and data silently disappears.
- Access control enforced only in the frontend.
- Spending the last hour on deployment surprises; deploy a skeleton early.

## Goals, non-goals and scope cuts

The product promise: "Write a doc, bring in an existing file, hand it to a teammate — and nothing gets lost."

### Goals

1. A reviewer can log in, create, format, rename and reopen a doc within 2 minutes, with no setup.
2. Every edit is autosaved and survives refresh; formatting round-trips exactly.
3. A .txt, .md or .docx file becomes a new editable doc with headings, lists and emphasis preserved.
4. An owner can share a doc with another user by email; the grantee sees it under "Shared with me" and can edit it; nobody else can reach it, even by URL or API.
5. The submission is easy to evaluate: live URL, seeded accounts, working README, honest notes.

### Non-goals (cut on purpose)

| Cut | Why | What replaces it |
|---|---|---|
| Real-time co-editing (CRDT, cursors) | 2+ days to do well; not required | Async sharing + conflict detection on save |
| Real auth (signup, OAuth, password reset) | Not what is being tested | Seeded users, email + password, signed cookie session |
| Comments, suggestions, version history | Stretch-only in the brief | Named as next steps |
| Images, tables, fonts, colors in the editor | Breadth, not depth | The 5 required formats + headings H1–H3, undo/redo |
| Folders, search, trash, templates | Nice-to-have dashboard features | A simple list sorted by last edited |
| Public links, link-sharing, org domains | Adds a whole access model | Share with a named existing user only |
| PDF/other upload types | Parsing cost, low value | .txt, .md, .docx only, stated in UI and README |
| Mobile-perfect layout | Desktop review is the realistic case | Responsive enough not to break on a laptop |

### Success criteria

- Every item in Goals passes on the deployed URL, not just locally.
- Access tests pass in CI (or at least `npm test` locally) and cover the deny paths.
- Total build time logged at 6 hours or less.

## Users and seeded accounts

Three seeded users are enough to prove both the grant and the deny path. Credentials are printed on the login page and in README/SUBMISSION.md, with one-click "Log in as…" buttons.

| User | Email | Password | Seeded state | Used to demo |
|---|---|---|---|---|
| Alice (owner) | alice@ajaia.test | demo1234 | Owns "Q4 Planning Notes" (shared with Bob) and "Private Draft" | Creating, formatting, sharing |
| Bob (collaborator) | bob@ajaia.test | demo1234 | Owns "Bob's Ideas"; has Alice's Q4 doc under Shared | Shared view, editing a shared doc |
| Carol (outsider) | carol@ajaia.test | demo1234 | No access to Alice's docs | "Not found" on a copied URL |

### Personas

- **Doc owner** — drafts notes, imports existing files, decides who can see them.
- **Collaborator** — receives a doc, edits it, cannot re-share or delete it.
- **Reviewer (the real user)** — wants to verify every claim in under 30 minutes without reading code.

### Permission matrix

| Action | Owner | Shared user (editor) | Anyone else |
|---|---|---|---|
| View / edit content | Yes | Yes | No (404) |
| Rename | Yes | Yes | No |
| Share / unshare | Yes | No | No |
| Delete | Yes | No | No |
| See in list | "My documents" | "Shared with me" | — |

Return 404 rather than 403 for docs the user cannot access, so IDs cannot be probed. Note this choice in the architecture note.

## Functional requirements

P0 = must ship for the submission to pass. P1 = ship if on schedule, it adds visible depth. P2 = only after everything else is deployed and documented.

### Documents and editing

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| D1 | Create a doc | P0 | "New document" creates "Untitled document" owned by the current user and opens the editor |
| D2 | Rename inline | P0 | Click title, type, blur or Enter saves; empty title rejected and reverted; max 200 chars |
| D3 | Rich-text editing | P0 | Toolbar + shortcuts for bold, italic, underline, H1–H3, bullet list, numbered list, undo/redo; active buttons reflect selection |
| D4 | Autosave | P0 | Saves 1s after typing stops and on blur/tab close; status shows Saving… / Saved / Error with retry |
| D5 | Reopen with formatting intact | P0 | Refresh or re-login shows identical content (stored as editor JSON) |
| D6 | Document list | P0 | Two sections: "My documents" and "Shared with me", each sorted by last edited, showing owner and updated time |
| D7 | Delete doc (owner only) | P1 | Confirm dialog; doc and its shares removed; shared users lose it from their list |
| D8 | Edit-conflict guard | P1 | Save carries the version it was based on; a stale save returns 409 and the UI offers "Reload latest" instead of silently overwriting |
| D9 | Unsaved-change protection | P1 | Browser warns on leave while a save is pending |

### File import

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| F1 | Import file as new doc | P0 | "Import file" accepts .txt, .md, .docx up to 5 MB; result opens as a new owned doc titled from the filename |
| F2 | Preserve structure | P0 | Markdown headings, lists, bold, italic convert; .docx headings, lists, bold, italic, underline convert via HTML |
| F3 | Clear limits in UI | P0 | Upload dialog states supported types and size; unsupported files rejected with a specific message before and after upload |
| F4 | Drag-and-drop on dashboard | P2 | Dropping a file onto the list triggers F1 |

### Sharing

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| S1 | Owner shares by email | P0 | Share dialog takes an email of an existing user; grantee immediately sees the doc under "Shared with me" |
| S2 | Share validation | P0 | Unknown email, own email and duplicate share each give a clear inline error |
| S3 | List and revoke access | P0 | Dialog lists current grantees; owner can remove one; access is gone on next request |
| S4 | Server-enforced access | P0 | Every doc read/write/share endpoint checks ownership or share; non-owners cannot share or delete |
| S5 | Visual distinction | P0 | Badges "Owner" / "Shared by Alice" in list and editor header |
| S6 | Viewer vs editor roles | P2 (stretch) | Viewer sees read-only editor and no toolbar; enforced in API |

### Accounts

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| A1 | Login with seeded users | P0 | Email + password form plus quick-login buttons; httpOnly signed session cookie |
| A2 | Logout and user switch | P0 | Header shows current user and Log out; switching users takes under 5 seconds |
| A3 | Route protection | P0 | Unauthenticated access to app pages redirects to login; API returns 401 |

## Screens and user flows

Four screens cover everything: Login, Dashboard, Editor, and two dialogs (Share, Import).

### Screens

| Screen | Contents | Empty / error states |
|---|---|---|
| Login `/login` | Email + password form, three "Log in as Alice / Bob / Carol" buttons, a one-line note on what each demonstrates | Wrong password → inline error, no detail on which field |
| Dashboard `/` | Header (user, Log out), New document, Import file, tabs or two sections: My documents / Shared with me; each row: title, owner badge, last edited | "No documents yet — create one or import a file"; "Nothing shared with you yet" |
| Editor `/docs/[id]` | Back link, editable title, Owner or "Shared by X" badge, Share button (owner only), sticky toolbar, save-status chip, editor canvas at page width | Not found page for missing or forbidden docs; save error banner with Retry |
| Share dialog | Email input + Share button, list of people with access (owner first), Remove per grantee | Inline errors for unknown user, self, duplicate |
| Import dialog | File picker, "Supported: .txt, .md, .docx — max 5 MB", progress state | Specific rejection messages; parser failure says the file could not be read |

### Core flows

1. **Write:** Login as Alice → New document → rename to "Launch plan" → type, add H2 and a bullet list, bold a phrase → status shows Saved → refresh → identical.
2. **Import:** Dashboard → Import file → choose `notes.md` → new doc "notes" opens with headings and lists intact → edit continues normally.
3. **Share:** In "Launch plan" → Share → enter bob@ajaia.test → Bob appears in the access list.
4. **Receive:** Log out → Bob → "Shared with me" shows "Launch plan · Shared by Alice" → Bob edits → Alice sees Bob's change on reopen.
5. **Deny:** Copy the doc URL → log in as Carol → paste → Not found; API call returns 404.
6. **Revoke:** Alice removes Bob → Bob's next refresh drops the doc.

These six flows are the demo script for the walkthrough video and the manual QA checklist.

## Tech stack (original — superseded by the Revisions table at the top)

One TypeScript codebase, one deploy, one managed Postgres: Next.js (App Router) + Tiptap + Prisma + Neon, hosted on Vercel.

| Layer | Choice | Why | Rejected alternative |
|---|---|---|---|
| App framework | Next.js 15, App Router, TypeScript | Frontend and API in one repo and one deploy | Separate React SPA + Express: two deploys, CORS, more config |
| Editor | Tiptap (StarterKit + Underline) | ProseMirror schema gives clean JSON, all required formats out of the box, `generateJSON` for imports | Quill (weaker schema), Lexical (more setup), raw contenteditable |
| Content format | Tiptap JSON in a `jsonb` column | Lossless round-trip, schema-validated, easy to export later | HTML strings: needs sanitizing and drifts from the schema |
| Database | Postgres on Neon (free tier) | Persists across deploys, relational fit for owner/share joins | SQLite on Vercel: filesystem is ephemeral |
| ORM | Prisma | Typed queries, migrations, simple seed script | Raw SQL: slower to write, no types |
| Auth | Seeded users, bcrypt hashes, signed httpOnly cookie (JWT) | Real server-side identity; no third-party account for reviewers | NextAuth/Clerk: setup time, external accounts |
| Validation | Zod on every request body | One schema per endpoint, typed errors | Ad hoc checks |
| File parsing | `mammoth` (.docx → HTML), `marked` (.md → HTML), plain text → paragraphs; then Tiptap `generateJSON` | One path into the editor schema, which drops unsupported markup | Client-side parsing: no server validation |
| UI | Tailwind CSS + a few accessible primitives (Dialog, Button, Input, Toast) | Fast, accessible dialogs | A full component library |
| Tests | Vitest | Fast, TS-native | Jest config overhead |
| Hosting | Vercel (free) + Neon | Git push deploys, no card required | Render/Railway: cold starts or paid tiers |

## Architecture (original)

Every document request passes one access check, `getDocumentAccess()` (owner, editor, viewer, or 404). Pages and API share it, so the UI can never grant more than the server allows. Imported files are parsed in memory and stored only as Tiptap JSON.

## Data model and API

Three tables carry the whole product. Ownership is a column on the document; access for everyone else is a row in `document_shares`.

| Table | Columns | Notes |
|---|---|---|
| `users` | `id` uuid PK, `email` unique, `name`, `password_hash`, `created_at` | Seeded only; no signup endpoint |
| `documents` | `id` uuid PK, `owner_id` FK users, `title` varchar(200), `content` jsonb, `version` int default 1, `created_at`, `updated_at` | Index on `(owner_id, updated_at desc)`; `version` increments on every content save for conflict detection |
| `document_shares` | `id` uuid PK, `document_id` FK documents on delete cascade, `user_id` FK users, `role` enum(editor, viewer) default editor, `created_at` | Unique `(document_id, user_id)`; index on `(user_id)` for the Shared list |

Imported files are parsed and discarded; only the resulting document is stored.

**Access rule (single source of truth):** `getDocumentAccess(userId, docId)` returns `owner`, `editor`, `viewer` or `null`. Every route calls it before doing anything; `null` becomes 404. This is the function the main tests target.

### Endpoints

| Method + path | Who | Body / returns | Errors |
|---|---|---|---|
| `POST /api/auth/login` | Anyone | `{email, password}` → sets cookie | 400 invalid body, 401 bad credentials |
| `POST /api/auth/logout` | Signed in | Clears cookie | — |
| `GET /api/documents` | Signed in | `{owned: [...], shared: [...]}` with owner name and role | 401 |
| `POST /api/documents` | Signed in | `{title?}` → new doc | 400, 401 |
| `GET /api/documents/:id` | Owner, grantee | Doc + `access` level | 401, 404 |
| `PATCH /api/documents/:id` | Owner, editor | `{title?, content?, baseVersion}` → `{version, updatedAt}` | 400, 404, 409 stale version, 413 too large |
| `DELETE /api/documents/:id` | Owner | — | 403 for grantee, 404 |
| `POST /api/documents/import` | Signed in | multipart `file` → new doc | 400 type, 413 size, 422 unreadable |
| `GET /api/documents/:id/shares` | Owner | List of grantees | 403, 404 |
| `POST /api/documents/:id/shares` | Owner | `{email, role?}` | 400, 404 user not found, 409 already shared, 422 self |
| `DELETE /api/documents/:id/shares/:userId` | Owner | — | 403, 404 |

## Validation, errors and security

Validate at the server boundary, fail with a specific message, never lose a user's typing.

| Input | Rule | Message shown |
|---|---|---|
| Title | 1–200 chars after trim | "Title can't be empty" / "Title is too long" |
| Content | Valid Tiptap JSON (`type: "doc"`), ≤ 1 MB serialized | "Document is too large to save" |
| Share email | Valid email, existing user, not self, not already shared | "No user with that email", "You already own this document", "Already shared with Bob" |
| Upload | Extension and MIME in {.txt, .md, .docx}; ≤ 5 MB; non-empty | "Only .txt, .md and .docx files are supported", "File is larger than 5 MB" |
| Parsed import | Converted doc has at least one node; parser exceptions caught | "We couldn't read this file. Try saving it again as .docx or .md." |

**Error handling.** One error shape `{error: {code, message}}`; the client maps `code` to UI copy. Autosave keeps local state on network failure, shows "Not saved — Retry", retries with backoff (1s, 3s, 10s); on 409 shows "This document changed elsewhere" with Reload or Overwrite. `beforeunload` warning while a save is pending. Toasts for one-off actions; inline errors for form fields. Server logs every 5xx with route and doc id.

**Security basics.** Access check server-side on every request; UI hiding is only cosmetic. 404 for no access; uuids, not sequential ids. Session cookie httpOnly, Secure, SameSite=Lax, signed with `SESSION_SECRET`, 7-day expiry. Passwords bcrypt-hashed; demo passwords are public on purpose and labeled demo-only. Imported HTML is never rendered directly; it only passes through Tiptap's schema. Uploads are parsed in memory; nothing is written to disk or executed.

## Testing and deployment

Tests target the two places a bug would hurt most: who can access a document, and whether an imported file keeps its structure.

| Test file | What it proves | Type |
|---|---|---|
| access | Owner gets `owner`; grantee gets `editor`; stranger gets `null`; revoked grantee gets `null` | Unit on `getDocumentAccess` against a test DB |
| documents routes | Stranger GET/PATCH → 404; grantee PATCH → 200; grantee DELETE and share → 403; stale `baseVersion` → 409 | Route integration |
| shares routes | Unknown email → 404, self → 422, duplicate → 409; shared doc appears in grantee's `shared` list | Route integration |
| import | Fixture .md and .docx produce headings, bullet lists, bold and italic nodes; .pdf rejected | Unit on the converter |

Manual QA: run the six core flows on the deployed URL in a fresh incognito window before recording the video. Check one Chrome and one Firefox load.

Local setup target: under 5 minutes from clone to running.

## Build plan (original 6-hour plan; actual plan in SUBMISSION.md)

1. Skeleton and deploy. 2. Documents and editor. 3. Access function first (with tests). 4. Sharing. 5. Import. 6. Hardening (validation, 409, retry, empty states, delete). 7. Docs. 8. Video and submit.

If a block overruns by more than 20 minutes, cut from P1 first (delete, 409 guard), never from docs or the video. Keep a running time log in `SUBMISSION.md`.

## Deliverables checklist

- [ ] Source — repo zip (without `node_modules` and `.env`) plus the GitHub link
- [ ] `README.md` — what it is, live URL, seeded logins, local setup, scripts, supported upload types, known limitations
- [ ] `ARCHITECTURE.md` — stack and why, data model, access rule, autosave and conflict handling, what was cut and why
- [ ] `AI_WORKFLOW.md` — tools used, where AI sped things up, what was changed or rejected, how it was verified
- [ ] `SUBMISSION.md` — exact file list, live URL, credentials, working / incomplete / next 2–4 hours, time log
- [ ] `VIDEO_URL.txt` — unlisted Loom or YouTube link
- [ ] Screenshots — dashboard, editor, share dialog, import, Carol's Not found page
- [ ] Live URL tested in incognito as all three users

### Walkthrough video script (4 minutes)

1. 0:00–0:20 — What I built and the one-line scope.
2. 0:20–2:00 — Flows 1–5 live: write, import, share, receive, deny.
3. 2:00–2:50 — Key decisions: Tiptap JSON, single access function, 404 for no access, version check, own Postgres over SQLite.
4. 2:50–3:30 — What I cut and why; what is incomplete.
5. 3:30–4:00 — How AI helped and one example of output I rejected.

## Stretch, next steps and risks

**Stretch pick:** Viewer vs editor roles (S6) — role column already exists; role select in share dialog, read-only Tiptap, 403 on PATCH for viewers, one extra test. Second choice: Export to Markdown.

**What I'd build next with 2–4 more hours:** version history; presence indicator via polling; comments anchored to text ranges; import into an existing doc and drag-and-drop; Playwright end-to-end test of the share flow in CI.

| Risk | Impact | Mitigation |
|---|---|---|
| Deployment or DB issues late | No live URL | Deploy early; own Postgres container on the VM |
| .docx conversion loses formatting | Import looks broken in the demo | Test real .docx early; state what is preserved |
| Autosave race (out-of-order saves) | Older content overwrites newer | One save in flight client-side + version check server-side |
| Scope creep into stretch work | Docs and video rushed | Stretch only after docs are written |
| Timebox overrun | Signals poor prioritization | Time log, cut P1 first |

## Open questions (resolved)

- Public GitHub repo in addition to the zip? → **Yes: `adilsalman-sys/ajaia-docs`.**
- Vercel + Neon, or a specific host? → **Own Oracle VM with Docker Compose.**
- Should the AI note name exact models? → **Yes, tools and models.**
