# Architecture Essentials

The one-page version of [ARCHITECTURE.md](ARCHITECTURE.md). Read this before changing code.

## Shape

```
Browser ──▶ web (Next.js 15, :3000) ──/api/* rewrite──▶ api (NestJS 11, :4000) ──Prisma──▶ db (Postgres 17)
```

- One Docker Compose project (`ajaia-docs`), one private network, one published port (web).
- The browser only calls same-origin `/api/*`. No CORS. Session = httpOnly cookie `ajaia_session` (HS256 JWT, 7 days).

## Invariants — do not break these

1. **Every document/share route goes through `AccessService.requireAccess()`.** No inline ownership checks.
2. **No access → 404, never 403.** 403 only when the caller already has some access (editor deleting, viewer editing).
3. **Content is Tiptap JSON**, validated server-side against the schema. Never store or render HTML.
4. **Web and API share one editor schema:** `StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'], HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } })`, `TextAlign.configure({ types: ['heading', 'paragraph'] })`, `Highlight`, `TaskList`, `TaskItem.configure({ nested: true })`. Change both or neither. Link hrefs must be http/https/mailto (rejected on save, stripped on import).
5. **Content saves are optimistic-locked:** `baseVersion` required; conditional `UPDATE … WHERE version = baseVersion`; mismatch → 409.
6. **One error shape:** `{ "error": { "code", "message", ...extra } }`. Messages are user-facing.
7. **Uploads stay in memory** (≤ 5 MB, .txt/.md/.docx); only the converted JSON is stored.
8. **Secrets come from env**, validated at boot. Nothing secret is committed.

## Roles

| | owner | editor | viewer | stranger |
|---|---|---|---|---|
| read | ✓ | ✓ | ✓ | 404 |
| edit content / rename | ✓ | ✓ | 403 | 404 |
| share / unshare / delete | ✓ | 403 | 403 | 404 |

## API request pipeline

`helmet` → `cookie-parser` → Throttler (120/min, login 5/min) → AuthGuard (`@Public()` opts out) → OriginGuard (state-changing requests) → `ValidationPipe` (whitelist + forbid unknown) → controller → `requireAccess` → Prisma → global exception filter.

## Autosave (web)

Debounce 1 s; flush on editor blur and tab hide; one request in flight; retries 1 s / 3 s / 10 s; 409 → Reload latest | Overwrite; `beforeunload` guard while dirty.

## Where things live

| Concern | Path |
|---|---|
| Access rule | `apps/api/src/access/` |
| Auth + cookie | `apps/api/src/auth/` |
| Conflict-safe save | `apps/api/src/documents/` |
| Import converter | `apps/api/src/import/` |
| Schema, migrations, seed | `apps/api/prisma/` |
| API docs (Swagger) | `/api/docs` at runtime, [API.md](API.md) |
| Autosave | `apps/web/src/hooks/useAutosave.ts` |
| API client | `apps/web/src/lib/api.ts` |
| Route protection (UX only) | `apps/web/src/middleware.ts` |
| Production stack | `docker-compose.yml`, `apps/*/Dockerfile`, `scripts/deploy.sh` |

## Commands

```bash
docker compose -f docker-compose.dev.yml up -d   # local Postgres on :5434
cd apps/api && npm run start:dev                 # API on :4000
cd apps/web && npm run dev                       # web on :3000
cd apps/api && npm test                          # access, routes, shares, import
```
