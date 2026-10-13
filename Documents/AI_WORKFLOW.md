# AI Workflow

How AI was used to build Ajaia Docs, what it got wrong, and how the output was checked.

## Tools

| Tool | Used for |
|---|---|
| **Claude Code** (Claude Opus 5.5, lead session) | Turning the PRD into a contract, splitting the work, reviewing every agent's output, integration fixes, deploy, docs |
| **Claude Code sub-agents** (same model, run in parallel) | API (NestJS), web (Next.js), infra (Docker/VM/CI), docs, landing page, Playwright E2E |
| **Claude (chat)** | Writing and pressure-testing the PRD before any code |

## How the work was organised

The lead session wrote the API contract first — endpoints, error codes, the editor schema — and then ran up to five agents at once, each owning a disjoint set of files ([AGENTS.md](../AGENTS.md)). Agents never committed; the lead reviewed and committed in small pieces. Each agent had to report command output (build, lint, test counts), not "it should work".

## Where AI sped things up

- **Parallel build.** API, web, infra and docs were written at the same time against one contract instead of one after another.
- **Boilerplate.** Nest modules, DTOs with class-validator, Prisma schema + migration, Dockerfiles, CI workflow, Swagger decorators.
- **Test breadth.** 80+ API tests covering every allow *and* deny path, plus Playwright specs for all six PRD flows.
- **Fixtures.** A real `.docx` with Word heading/list styles generated programmatically to test import.
- **VM recon.** Reading the shared server's ports, firewall and proxy before touching anything.

## What was changed or rejected

| # | AI output | Problem | What I did instead |
|---|---|---|---|
| 1 | The PRD's default stack: Vercel + Neon | Didn't match our infra; reviewers would depend on two external services | Own Oracle VM, isolated Docker Compose project with its own Postgres |
| 2 | Save handler returned the version by **re-reading** the row after the conditional update | A concurrent save between the two queries hands the client someone else's version → its next save silently overwrites their work (the exact bug the version check exists to stop) | Return `baseVersion + 1`, the version *this* write produced |
| 3 | HTML → editor JSON via `@tiptap/html/server` | Its `happy-dom` dependency is ESM-only and crashed under Jest; `linkedom` failed the same way | `jsdom` + ProseMirror's parser on the same schema — scripts and unknown tags still dropped |
| 4 | Test env loader **overwrote** every variable from `.env.test` | CI's Postgres URL was replaced by the local one → every suite failed in CI. The naive fix (don't override) would let a stray shell `DATABASE_URL` point tests at a dev DB and truncate it | `.env.test` stays authoritative; an explicit `TEST_DATABASE_URL` (set only by CI) wins |
| 5 | Disable the login rate limit in tests | Then the 429 path is never tested | Each test login uses its own `X-Forwarded-For`; one test proves the 6th attempt from one IP gets 429 |
| 6 | One proxy hop trusted for client IPs | Behind Caddy → Next.js → API, every user would share one rate-limit bucket (Caddy's IP) | `TRUST_PROXY_HOPS=2` in production, configurable and validated |
| 7 | Hard-coded dummy bcrypt hash for "unknown email" timing | A malformed literal makes `bcrypt.compare` throw | Hash generated once at startup |
| 8 | "Shared" badge colour from the first design pass | 4.36:1 contrast — fails WCAG AA | Darker text token (4.82:1); all dark-theme pairs measured too |
| 9 | Shell scripts committed with Windows line endings | `#!/bin/sh` entrypoint would fail inside Linux containers | `.gitattributes` forces LF |
| 10 | Custom cursor, parallax and floating buttons across the whole app | Hurts typing in an editor; reads as generated | Effects kept to the public landing page; the editor stays restrained |

## How output was verified

- **Read, not trusted:** every access-control path (`AccessService`, guards, `requireAccess` call sites, the conditional save) was read line by line before commit — that review found #2.
- **Deny paths first:** tests assert stranger → 404, grantee delete/share → 403, viewer edit → 403, stale save → 409, bad origin → 403, `javascript:` links rejected.
- **Real database:** API tests run against Postgres (locally and in CI), not mocks.
- **Real files:** the sample `.docx` was run through the converter to confirm headings, lists, bold, italic and underline survive.
- **Browser E2E:** Playwright specs for the six PRD flows plus auth, dashboard, autosave/conflict and import rejections.
- **Production check:** the six flows were run on the live HTTPS URL as Alice, Bob and Carol, and the walkthrough video is a recording of that run.
- **Shared server safety:** after changing the shared Caddy config, the other two sites on the VM were checked to still return 200.
