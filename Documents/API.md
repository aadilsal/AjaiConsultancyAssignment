# API Reference

REST + JSON API for Ajaia Docs (NestJS 11). This file is the human-readable contract. The live, code-generated contract is Swagger.

| | |
|---|---|
| **Base URL** | `/api`, same-origin through the Next.js rewrite (`web` → `http://api:4000/api`). Every route is also served at `/api/v1/...` |
| **Live** | `https://docs.51-170-90-86.sslip.io/api` |
| **Local** | `http://localhost:3000/api` (through Next.js) or `http://localhost:4000/api` (API directly) |
| **Swagger UI** | `/api/docs` |
| **OpenAPI JSON** | `/api/docs-json` |
| **Auth** | `ajaia_session` cookie (HS256 JWT, `HttpOnly`, `SameSite=Lax`, 7 days), set by login |
| **Content type** | `application/json`, except import (`multipart/form-data`) |
| **IDs** | UUID v4 strings |
| **Timestamps** | ISO 8601 UTC, e.g. `2026-10-13T14:02:11.482Z` |

## Conventions

**Authentication.** Every route requires the session cookie except `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /health`, `/health/live`, `/health/ready` and `/docs*`. A missing, expired or invalid cookie → `401 UNAUTHENTICATED`.

**CSRF.** The session cookie is `SameSite=Lax`, and POST, PATCH and DELETE with an `Origin` header not in `ALLOWED_ORIGINS` get `403 BAD_ORIGIN`. Browsers send `Origin` automatically; requests without one (curl, server-to-server) are allowed.

**Rate limits.** 120 requests/min per IP across the API; `POST /auth/login` is limited to 5/min per IP. Over the limit → `429 RATE_LIMITED`.

**Validation.** Unknown body fields are rejected (`whitelist` + `forbidNonWhitelisted`) → `400 VALIDATION_ERROR`.

**Versioning.** URI versioning: `/api/...` (unversioned, used by the web app) and `/api/v1/...` hit the same handlers. A future breaking change ships as `/api/v2`.

**Request IDs.** Send `X-Request-Id` (`[A-Za-z0-9._:-]`, ≤ 128 chars) or the API generates a UUID. It is echoed in the response header, included as `requestId` in every error body and in every log line.

**Media types.** POST/PUT/PATCH bodies must be `application/json` (import: `multipart/form-data`), otherwise `415 UNSUPPORTED_MEDIA_TYPE`. JSON bodies are capped at 2 MB.

**Caching and compression.** Every API response sends `Cache-Control: no-store`. Responses are gzip-compressed when the client accepts it.

**Created resources.** `201` responses (create, import, share) carry a `Location` header pointing at the new resource.

**Rate-limit headers.** Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`; a `429` adds `Retry-After` (seconds).

**Unknown routes.** Unknown paths or methods → `404 NOT_FOUND` in the error envelope.

**Logging.** One structured JSON line per request in production (`method`, `path`, `status`, `durationMs`, `requestId`, `userId`); 5xx lines add the stack. Bodies, cookies and passwords are never logged.

**Proxies.** `TRUST_PROXY_HOPS` (default 1; 2 behind Caddy + Next.js) sets how many proxy hops are trusted, so the client IP used for rate limiting is real. HSTS is sent only when `COOKIE_SECURE=true`.

## Errors

Every non-2xx response uses one envelope. `message` is user-ready copy; some codes add extra fields.

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "This document changed elsewhere.", "currentVersion": 7, "requestId": "6f1c2a7e-2b9e-4d8e-9a43-0f2b8f3f9d11" } }
```

Every error body includes `requestId` (same value as the `X-Request-Id` response header).

| Code | HTTP | When | Extra fields |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Body or param fails its DTO (bad email, empty title, unknown field, `content` without `baseVersion`) | `details: string[]` |
| `INVALID_CONTENT` | 400 | `content` is not a valid Tiptap doc for the editor schema, or has unsafe attrs (link href not http/https/mailto, bad `textAlign`, heading level outside 1–3) | — |
| `UNSUPPORTED_TYPE` | 400 | Import is not `.txt`, `.md` or `.docx` | — |
| `EMPTY_FILE` | 400 | Import is 0 bytes or missing | — |
| `UNAUTHENTICATED` | 401 | No, expired or invalid session cookie | — |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password (same message for both) | — |
| `FORBIDDEN` | 403 | Caller has access but the role does not allow the action (editor deletes or shares, viewer edits) | — |
| `BAD_ORIGIN` | 403 | State-changing request whose `Origin` header is present and not allow-listed (no `Origin`, e.g. curl, is allowed; SameSite=Lax is the primary CSRF defence) | — |
| `NOT_FOUND` | 404 | Doc missing, id malformed, **or caller has no access** | — |
| `USER_NOT_FOUND` | 404 | Share target email is not a user | — |
| `EMAIL_TAKEN` | 409 | Register with an email that already has an account (case-insensitive) | — |
| `ALREADY_SHARED` | 409 | Doc is already shared with that user | — |
| `VERSION_CONFLICT` | 409 | `baseVersion` ≠ current version | `currentVersion: number` |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Body is not `application/json` (or not `multipart/form-data` on import) | — |
| `CONTENT_TOO_LARGE` | 413 | Serialized content > 1 MB | — |
| `FILE_TOO_LARGE` | 413 | Import > 5 MB | — |
| `SELF_SHARE` | 422 | Owner shares with their own email | — |
| `UNREADABLE_FILE` | 422 | Parser failed or the file produced no content | — |
| `RATE_LIMITED` | 429 | Rate limit exceeded | — |
| `INTERNAL_ERROR` | 500 | Anything unexpected (logged server-side; generic message) | — |

## Permissions

| Action | Owner | Editor | Viewer | Stranger |
|---|---|---|---|---|
| `GET /documents/:id` | 200 | 200 | 200 | **404** |
| `PATCH /documents/:id` (title or content) | 200 | 200 | 403 | **404** |
| `DELETE /documents/:id` | 204 | 403 | 403 | **404** |
| `GET /documents/:id/shares` | 200 | 403 | 403 | **404** |
| `POST /documents/:id/shares` | 201 | 403 | 403 | **404** |
| `DELETE /documents/:id/shares/:userId` | 204 | 403 | 403 | **404** |
| Appears in `GET /documents` | `owned` | `shared` | `shared` | — |

**404, not 403.** A caller with no access gets the same `404 NOT_FOUND` as for a document that does not exist, so ids cannot be probed. Grantees get `403` for owner-only actions because they already know the document exists. Access is re-checked on every request; revoking a share takes effect immediately.

## Types

```ts
type Role = 'editor' | 'viewer';
type Access = 'owner' | Role;

interface User { id: string; name: string; email: string }

interface DocSummary {
  id: string;
  title: string;            // 1–200 chars
  createdAt: string;
  updatedAt: string;
  owner: User;
  access: Access;           // the caller's access
}

interface DocDetail extends DocSummary {
  content: TiptapJSON;      // { type: 'doc', content: [...] }
  version: number;          // starts at 1, +1 per content save
}

interface Share { userId: string; name: string; email: string; role: Role; createdAt: string }
```

Supported Tiptap nodes and marks: `doc`, `paragraph`, `heading` (levels 1–3), `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `hardBreak`, `horizontalRule`, `text`; marks `bold`, `italic`, `underline`, `strike`, `code`.

---

## Auth

### `POST /api/auth/login`

Public. Verifies credentials and sets the `ajaia_session` cookie.

Request:
```json
{ "email": "alice@ajaia.test", "password": "demo1234" }
```
`200 OK` + `Set-Cookie: ajaia_session=…; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
```json
{ "user": { "id": "0b6f6d1e-3c1a-4e8f-9a51-2f0e6a8c1d11", "name": "Alice", "email": "alice@ajaia.test" } }
```
Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `403 BAD_ORIGIN`, `429 RATE_LIMITED` (5/min/IP).

```bash
BASE=https://docs.51-170-90-86.sslip.io
curl -s -c cookies.txt -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d '{"email":"alice@ajaia.test","password":"demo1234"}' $BASE/api/auth/login
```

### `POST /api/auth/register`

Public, 5/min/IP. Creates an account and signs in (same cookie as login).
```json
{ "name": "Dana Lee", "email": "dana@ajaia.test", "password": "secret123" }
```
`name` trimmed, 1–80 chars · `email` valid, trimmed and lowercased, ≤ 254 · `password` 8–72 chars with at least one letter and one number (bcrypt cost 10).

`201 Created` + `Location: /api/auth/me` + `Set-Cookie: ajaia_session=…` → `{ "user": { "id", "email", "name" } }`

Errors: `400 VALIDATION_ERROR`, `403 BAD_ORIGIN`, `409 EMAIL_TAKEN` ("An account with this email already exists."), `415 UNSUPPORTED_MEDIA_TYPE`, `429 RATE_LIMITED`.
```bash
curl -s -c cookies.txt -H 'Content-Type: application/json'   -d '{"name":"Dana Lee","email":"dana@ajaia.test","password":"secret123"}' $BASE/api/auth/register
```

### `POST /api/auth/logout`

Public (idempotent). Clears the cookie. `204 No Content`. Errors: `403 BAD_ORIGIN`.
```bash
curl -s -b cookies.txt -c cookies.txt -H "Origin: $BASE" -X POST $BASE/api/auth/logout -o /dev/null -w "%{http_code}\n"
```

### `GET /api/auth/me`

Signed in. Returns the current user.
```json
{ "user": { "id": "0b6f6d1e-3c1a-4e8f-9a51-2f0e6a8c1d11", "name": "Alice", "email": "alice@ajaia.test" } }
```
Errors: `401 UNAUTHENTICATED`.
```bash
curl -s -b cookies.txt $BASE/api/auth/me
```

## Health

### `GET /api/health`

Public. Pings the database; used by the Docker healthcheck.

`200 OK` → `{ "status": "ok", "db": "ok" }` · `503 Service Unavailable` → `{ "status": "error", "db": "down" }`

### `GET /api/health/live`

Public. Liveness only (process is up, no dependencies). `200 OK` → `{ "status": "ok", "uptimeSeconds": 42 }`

### `GET /api/health/ready`

Public. Readiness (database reachable). Same responses as `GET /api/health`.
```bash
curl -s $BASE/api/health
```

## Documents

### `GET /api/documents`

Signed in. Both lists are sorted by `updatedAt` desc (ties by `id` desc).

Query (optional): `limit` (1–100, default 50, applied to each list) and `cursor`. Each list returns a `nextCursor` (`null` when there is no more). Pass one of them back as `?cursor=` to get the next page of **that list only** (the other array comes back empty). Bad `limit`/`cursor` → `400 VALIDATION_ERROR`.
```json
{
  "owned": [
    { "id": "7d2c9a40-5b1e-4f7a-8c33-91e0d4b2a6f5", "title": "Q4 Planning Notes",
      "createdAt": "2026-10-12T09:00:00.000Z", "updatedAt": "2026-10-13T14:02:11.482Z",
      "owner": { "id": "0b6f6d1e-3c1a-4e8f-9a51-2f0e6a8c1d11", "name": "Alice", "email": "alice@ajaia.test" },
      "access": "owner" }
  ],
  "shared": [],
  "nextCursor": { "owned": null, "shared": null }
}
```
Errors: `400 VALIDATION_ERROR`, `401`.
```bash
curl -s -b cookies.txt $BASE/api/documents
```

### `POST /api/documents`

Signed in. Creates an empty doc owned by the caller. Body (optional): `{ "title"?: string }` (1–200 chars after trim; default `"Untitled document"`).

`201 Created` → `DocDetail`
```json
{ "id": "c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10", "title": "Launch plan",
  "createdAt": "2026-10-13T15:00:00.000Z", "updatedAt": "2026-10-13T15:00:00.000Z",
  "owner": { "id": "0b6f6d1e-3c1a-4e8f-9a51-2f0e6a8c1d11", "name": "Alice", "email": "alice@ajaia.test" },
  "access": "owner", "version": 1,
  "content": { "type": "doc", "content": [{ "type": "paragraph" }] } }
```
Errors: `400 VALIDATION_ERROR`, `401`, `403 BAD_ORIGIN`.
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d '{"title":"Launch plan"}' $BASE/api/documents
```

### `GET /api/documents/:id`

Owner, editor or viewer. `200 OK` → `DocDetail` (same shape as above, with `access` set to the caller's role).
Errors: `401`, `404 NOT_FOUND` (missing, malformed id, or no access).
```bash
curl -s -b cookies.txt $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10
```

### `PATCH /api/documents/:id`

Owner or editor. Send at least one of `title` and `content`.

| Field | Type | Rule |
|---|---|---|
| `title` | string | 1–200 chars after trim. A title-only PATCH does **not** change `version` |
| `content` | TiptapJSON | Valid against the editor schema, ≤ 1 MB serialized |
| `baseVersion` | integer | **Required with `content`**: the version the edit was based on |

```json
{ "content": { "type": "doc", "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Goals" }] },
    { "type": "bulletList", "content": [{ "type": "listItem", "content": [
      { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Ship v1" }] }] }] }
  ] },
  "baseVersion": 3 }
```
`200 OK`
```json
{ "id": "c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10", "title": "Launch plan", "version": 4, "updatedAt": "2026-10-13T15:04:27.120Z" }
```
The content write is atomic (`UPDATE … WHERE version = baseVersion`). If someone else saved first:
```json
{ "error": { "code": "VERSION_CONFLICT", "message": "This document changed elsewhere.", "currentVersion": 5 } }
```
Errors: `400 VALIDATION_ERROR | INVALID_CONTENT`, `401`, `403 FORBIDDEN` (viewer) `| BAD_ORIGIN`, `404`, `409 VERSION_CONFLICT`, `413 CONTENT_TOO_LARGE`.
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -H "Content-Type: application/json" -X PATCH \
  -d '{"title":"Launch plan v2"}' $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10
```

### `DELETE /api/documents/:id`

Owner only. Deletes the doc and all its shares (cascade). `204 No Content`.
Errors: `401`, `403 FORBIDDEN` (grantee) `| BAD_ORIGIN`, `404`.
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -X DELETE $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10 -w "%{http_code}\n"
```

### `POST /api/documents/import`

Signed in. `multipart/form-data` with one field, `file`: `.txt`, `.md` or `.docx`, at most 5 MB. Parsed in memory and converted to Tiptap JSON; the original file is not stored. The title is the filename without its extension.

Preserved: H1–H3, paragraphs, bold, italic, underline, strike, bullet and numbered lists, blockquotes, code, line breaks. Dropped: images, tables, fonts, colours.

`201 Created` → `DocDetail` (`version: 1`, `access: "owner"`).
Errors: `400 UNSUPPORTED_TYPE | EMPTY_FILE`, `401`, `403 BAD_ORIGIN`, `413 FILE_TOO_LARGE`, `422 UNREADABLE_FILE`.
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -F "file=@notes.md;type=text/markdown" $BASE/api/documents/import
```

## Shares

### `GET /api/documents/:id/shares`

Owner only.
```json
{
  "owner": { "id": "0b6f6d1e-3c1a-4e8f-9a51-2f0e6a8c1d11", "name": "Alice", "email": "alice@ajaia.test" },
  "shares": [
    { "userId": "5a9e2c7b-1f4d-4c6a-b8e2-7d3f0a1c9e42", "name": "Bob", "email": "bob@ajaia.test",
      "role": "editor", "createdAt": "2026-10-13T15:10:00.000Z" }
  ]
}
```
Errors: `401`, `403 FORBIDDEN` (grantee), `404`.
```bash
curl -s -b cookies.txt $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10/shares
```

### `POST /api/documents/:id/shares`

Owner only. Body: `{ "email": string, "role"?: "editor" | "viewer" }` (default `editor`).

`201 Created` → `Share`
```json
{ "userId": "5a9e2c7b-1f4d-4c6a-b8e2-7d3f0a1c9e42", "name": "Bob", "email": "bob@ajaia.test", "role": "editor", "createdAt": "2026-10-13T15:10:00.000Z" }
```
Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN | BAD_ORIGIN`, `404 NOT_FOUND | USER_NOT_FOUND`, `409 ALREADY_SHARED`, `422 SELF_SHARE`.
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d '{"email":"bob@ajaia.test","role":"editor"}' $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10/shares
```

### `DELETE /api/documents/:id/shares/:userId`

Owner only. Revokes access immediately. `204 No Content`.
Errors: `401`, `403 FORBIDDEN | BAD_ORIGIN`, `404` (doc not accessible, or no such share).
```bash
curl -s -b cookies.txt -H "Origin: $BASE" -X DELETE \
  $BASE/api/documents/c41e8f2a-0d6b-4b8e-a7f1-3e5d9c2b8a10/shares/5a9e2c7b-1f4d-4c6a-b8e2-7d3f0a1c9e42 -w "%{http_code}\n"
```

---

## Smoke test: the deny path

```bash
# Alice's doc id from GET /api/documents, then log in as Carol and request it:
curl -s -c carol.txt -H "Origin: $BASE" -H "Content-Type: application/json" \
  -d '{"email":"carol@ajaia.test","password":"demo1234"}' $BASE/api/auth/login
curl -s -b carol.txt $BASE/api/documents/<alice-doc-id>
# → 404 {"error":{"code":"NOT_FOUND","message":"Document not found."}}
```
