# KelasKita

KelasKita is an independent, no-account-required experiment for student reviews of courses and lecturers. Courses, lecturers and their many-to-many teaching assignments are separate records. Every review is committed as `pending`; only `published` reviews enter public feeds and ratings.

The production path is now server-backed. The browser holds interface state only: it does not persist courses, reviews, reports, private contacts or moderation logs.

## Run and verify

Node.js 22 or newer is required.

```bash
npm install
npm test
npm run build
npm run dev
```

The Vite server can display and test the interface, but its `/api` routes require Vercel Functions. Use a linked Vercel project for an end-to-end local run:

```bash
vercel link
vercel env pull .env.local
vercel dev
```

## Production architecture

- Neon Postgres is the system of record. [`database/schema.sql`](database/schema.sql) contains constraints, indexes, public views, encrypted-contact columns, rate-limit buckets, private decisions and the moderation queue.
- Public writes are same-origin, require a Cloudflare-injected origin secret, are Turnstile-verified, bounded with Zod, and rate-limited again in Postgres.
- A review transaction upserts its pending course, lecturer and teaching assignment, creates the pending review, and enqueues moderation atomically. Catalogue records enter public dropdowns only when an associated review is published.
- One Qwen request produces four specialist findings. [`src/lib/moderationCore.js`](src/lib/moderationCore.js) applies fixed rules and never asks the model to determine truth, fraud, defamation, legality or guilt.
- Failed AI work retries with exponential back-off. Jobs are claimed with `FOR UPDATE SKIP LOCKED`; a daily Hobby-compatible cron and the private operator console can drain the queue.
- `/moderation` is a private, signed, HTTP-only operator session. It provides urgent-first triage, AI findings, retry controls, reasoned human decisions and live database/AI checks.
- Review-author appeals require the private one-time receipt; report appeals use their unguessable report ID. Appeal and lecturer-verification contacts use AES-256-GCM with a server-only key. Rotating HMACs, rather than raw IP addresses, support abuse controls and are cleared after 30 days.

## Moderation states

- Clean structured agent pass: `published`.
- Agent unavailable: stays `pending` and retries.
- Threat or personal information: rejected at submission, or temporarily held after a report.
- Serious criminal, corruption or sexual-misconduct allegation: `held` for human review and referral to a formal reporting channel.
- Reports, appeals and lecturer replies remain available to a human operator with a private decision record and reason.

## Deployment hand-off

Follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) in order. It covers Neon provisioning, migrations, Vercel variables, the live AI Gateway test, Turnstile, Cloudflare rate limits, the exact Vercel-provided CNAME and production verification.

Public submissions must remain closed until both external launch gates are signed:

- [`docs/LEGAL_LAUNCH_GATE.md`](docs/LEGAL_LAUNCH_GATE.md): Malaysian counsel records scope and advice.
- [`docs/URGENT_REMOVAL_RUNBOOK.md`](docs/URGENT_REMOVAL_RUNBOOK.md): named primary and backup operators complete a timed staging drill.

The software cannot truthfully sign either human gate itself.

## Design references

- [`design/discovery-concept.png`](design/discovery-concept.png)
- [`design/review-flow-concept.png`](design/review-flow-concept.png)

The interface does not use university logos or imply university endorsement.
