# Security Essentials

What Ajaia Docs protects, from whom, and how. The controls map to the OWASP Top 10 (2021). The gaps are listed honestly at the end. Related docs: [ARCHITECTURE.md](ARCHITECTURE.md) and [API.md](API.md).

## 1. Threat model

| Asset | Why it matters |
|---|---|
| Document content and titles | Users' private writing; the only valuable data in the system |
| Share grants (`document_shares`) | Decide who can read and write each document |
| Sessions (`ajaia_session` JWT cookie) | Holding one means acting as that user for up to 7 days |
| `SESSION_SECRET`, `POSTGRES_PASSWORD` | Anyone with them can forge any session or read every row |

| Actor | Goal | Main defence |
|---|---|---|
| Stranger with a URL | Read or edit a doc whose link they saw | `AccessService` on every route; 404 for no access; UUID ids |
| Grantee overreaching | Delete, re-share or (as a viewer) edit a doc | Role check per action → 403; role re-read on every request |
| Hostile uploaded file | XSS, parser crash, resource exhaustion | 5 MB cap, allow-list, memory-only parse, Tiptap schema strips unknown markup |
| Network attacker | Steal the cookie or read traffic | **Not mitigated on the live URL (plain HTTP).** See §7 |
| Credential guesser | Brute-force a password | 5 login attempts/min/IP, generic error, bcrypt |
| Cross-site attacker | Make the browser send a state-changing request | SameSite=Lax + JSON-only API + Origin allow-list (§3) |

Trust boundary: the browser is untrusted. The UI hides Share, Delete and the toolbar for convenience only; the API decides every time.

## 2. Controls mapped to OWASP Top 10 (2021)

| OWASP | Risk here | Controls in place | Verified by |
|---|---|---|---|
| **A01 Broken Access Control** | Reading or editing another user's doc | `AccessService.getDocumentAccess()` runs on **every** document and share route, with no caching, so a revoke applies on the next request. No access → **404, not 403**, so ids cannot be probed. Ids are UUIDv4, so they are not guessable. Owner-only actions (share, unshare, delete) return 403 to grantees; viewers get 403 on PATCH. | Jest + Supertest deny-path tests: stranger GET/PATCH/DELETE → 404, editor DELETE/share → 403, revoked grantee → 404 |
| **A02 Cryptographic Failures** | Password or session forgery | bcrypt (cost 10) for passwords. HS256 JWT signed with `SESSION_SECRET`; the app **refuses to boot** if it is shorter than 32 chars. No secrets in the JWT payload (`{sub}` only). | Boot-time config validation; unit test on the auth service |
| **A03 Injection** | SQL injection, XSS via content or imports | Prisma parameterized queries only (no `$queryRawUnsafe`). Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` + `transform`. Content is validated with `schema.nodeFromJSON(content).check()`. Imported HTML is **never rendered**; it only passes through Tiptap `generateJSON`, which drops `<script>`, `<style>`, event handlers and unknown tags. React escapes all text. | Validation tests (unknown field → 400, bad node → 400 `INVALID_CONTENT`) |
| **A04 Insecure Design** | Lost updates, resource abuse | Optimistic locking: `UPDATE … WHERE version = $baseVersion`, 0 rows → 409. Limits: title ≤ 200 chars, content ≤ 1 MB serialized, upload ≤ 5 MB, JSON body ≤ 2 MB. No signup or reset flows to abuse. | Conflict test (stale `baseVersion` → 409) |
| **A05 Security Misconfiguration** | Leaky headers, exposed services, root containers | API: `helmet()`, `x-powered-by` off. Web (`next.config.ts` headers): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `poweredByHeader: false`. Containers run as a non-root user with `no-new-privileges`, memory limits and healthchecks. **Only `web` publishes a port**; `api` and `db` stay on the private `ajaia_docs_net` network. 500s return a generic message. | `curl -I` header check; `docker compose ps` shows one published port |
| **A06 Vulnerable Components** | Known CVEs in dependencies | Pinned lockfiles; `npm audit` reviewed before submission; current majors (Next 15, Nest 11, Prisma 6, Node 22). | `npm audit --omit=dev` |
| **A07 Identification & Auth Failures** | Credential stuffing, session theft | Login throttled to **5/min/IP** (global 120/min). Generic `INVALID_CREDENTIALS` message (does not say which field was wrong). Cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, 7-day expiry; `Secure` set by `COOKIE_SECURE`. Logout clears the cookie. | Login test: wrong password → 401 with the same message as unknown email |
| **A08 Software & Data Integrity** | Tampered builds or dependencies | `package-lock.json` committed; images build with `npm ci`; CI (GitHub Actions) runs API tests and web lint/build on every push. JWTs are signature-checked on every request. | CI status |
| **A09 Logging & Monitoring** | Silent failures | Global exception filter logs every 5xx with method, route and document id (never content or passwords). Docker `json-file` log rotation (`max-size 10m`, `max-file 3`). `/api/health` pings the DB for the container healthcheck. | `docker compose logs api` |
| **A10 SSRF** | Server fetching attacker URLs | The server makes **no outbound requests** based on user input. Imports are uploaded bytes, not URLs, and `link: false` in the Tiptap config. | Code review: no `fetch`/`http` client in the API |

## 3. CSRF

| Layer | Effect |
|---|---|
| `SameSite=Lax` cookie | Browsers drop the cookie on cross-site POST, PATCH and DELETE |
| JSON-only API | State-changing endpoints require `Content-Type: application/json` (a plain HTML form cannot send it); import is the one multipart route and is covered by the Origin check |
| `OriginGuard` | On POST, PATCH and DELETE, `Origin` (or `Referer` when `Origin` is absent) must match `APP_ORIGIN`. Otherwise **403 `BAD_ORIGIN`**. |
| No CORS | Same-origin through the Next.js rewrite; the API sends no `Access-Control-Allow-*` headers |

## 4. Upload handling (`POST /api/documents/import`)

| Rule | Detail | Failure |
|---|---|---|
| Size | ≤ 5 MB (Multer `limits.fileSize`) | 413 `FILE_TOO_LARGE` |
| Non-empty | Rejects 0-byte files | 400 `EMPTY_FILE` |
| Type | Extension ∈ {`.txt`, `.md`, `.docx`} **and** MIME consistent with it | 400 `UNSUPPORTED_TYPE` |
| Storage | `memoryStorage()`: never written to disk, never executed, discarded after parsing | — |
| Parsing | `mammoth` / `marked` / plain text → HTML → Tiptap JSON; parser exceptions are caught | 422 `UNREADABLE_FILE` |
| Output | Must yield ≥ 1 content node; title taken from the filename (trimmed, ≤ 200 chars) | 422 `UNREADABLE_FILE` |

`.docx` is a zip, so the 5 MB cap on the compressed upload bounds the work mammoth can be made to do.

## 5. Secrets management

- `.env` is **generated on the VM** by `scripts/deploy.sh` on first deploy (`openssl rand -base64 48` for `SESSION_SECRET` and `POSTGRES_PASSWORD`) with mode `600`.
- `.env` is in `.gitignore` and `.dockerignore`; only `.env.example` (placeholders) is committed.
- Secrets reach containers through Compose `env_file`, not build args, so they are not baked into image layers.
- Config is validated at boot: a missing `DATABASE_URL`, or a `SESSION_SECRET` shorter than 32 chars, aborts startup.
- Rotating `SESSION_SECRET` invalidates every session; that is the emergency "log everyone out" switch.

## 6. Data protection

- Passwords: bcrypt hashes only, never logged or returned. `User` responses expose `id`, `name` and `email`.
- Content is stored as Tiptap JSON in `jsonb`. Deleting a document cascades to its shares.
- The DB volume `ajaia_docs_pgdata` is reachable only from the compose network.

## 7. Known gaps and accepted risks

| Gap | Risk | Why accepted now | Fix |
|---|---|---|---|
| **Plain HTTP on a raw IP** | Cookie not `Secure`; credentials, session and content travel unencrypted and can be sniffed or modified on hostile networks | No domain for this submission | Point a domain at the VM, put **Caddy** in front (automatic Let's Encrypt TLS), set `COOKIE_SECURE=true`, add HSTS, close `WEB_PORT` to the public |
| Demo passwords are public | Anyone can log in as Alice, Bob or Carol | By design: reviewers need zero setup; the data is demo-only | Real signup, unique passwords, remove the quick-login buttons |
| No session revocation list | A stolen cookie works until it expires (7 days), even after logout | Stateless JWT keeps the scope small | `sessions` table or `tokenVersion` on the user, checked per request; shorter TTL + refresh |
| No account lockout | Slow distributed guessing is still possible | The 5/min/IP rate limit is enough for a demo | Per-account backoff, lockout after N failures, alerting |
| Swagger UI is public | Anyone can read the API contract | Read-only, contains no data, and helps reviewers | Put `/api/docs` behind auth or disable it in production |
| No CSP header | Less defence in depth against XSS | Tiptap/ProseMirror inline styles need a tuned policy | Nonce-based CSP via Next middleware |
| In-memory rate limiter | Limits reset on restart and are per instance | Single instance | Redis-backed throttler storage |
| No backups | Losing the volume loses all documents | Demo data is re-seeded on start | Nightly `pg_dump` to object storage |

## 8. Pre-production checklist

- [ ] Domain + TLS (Caddy / Let's Encrypt); `COOKIE_SECURE=true`; HSTS enabled
- [ ] Only ports 80/443 open on the VM firewall; `WEB_PORT` not public
- [ ] Fresh `SESSION_SECRET` (≥ 32 chars) and `POSTGRES_PASSWORD` generated on the host, not reused
- [ ] Demo users and quick-login buttons removed; real signup with password policy
- [ ] `APP_ORIGIN` set to the exact HTTPS origin
- [ ] Content-Security-Policy added and tested against the editor
- [ ] `/api/docs` disabled or behind auth
- [ ] Session revocation (`tokenVersion`) and per-account lockout
- [ ] `npm audit` clean at high/critical; Dependabot or Renovate enabled
- [ ] Deny-path tests green in CI (stranger 404, grantee 403, revoked 404, stale version 409)
- [ ] Nightly DB backup, with one restore tested
- [ ] Log shipping and an alert on 5xx rate
