# Production deployment

Keep submissions closed until the automated checks pass and one monitored operator contact is configured.

## Current production snapshot

Last verified: 22 August 2026.

- Repository: `cosineFox/Kelas-Kita`, branch `main`
- Vercel project: `cosinefoxs-projects/kelas-kita`, with Root Directory `app`
- Public origin: `https://kelaskita.catbox404.dev`
- Database: Supabase Postgres through the Vercel-managed connection variables
- Moderation model: `alibaba/qwen3.7-flash` through Vercel AI Gateway, with reasoning disabled for structured output
- Cloudflare DNS: proxied
- Request-header rule: `KelasKita trusted edge origin gate`
- Rate-limit rule: `KelasKita write surge guard`
- Submission state: open; launched from zero public courses, lecturers and reviews on 22 August 2026

The request-header rule applies to `kelaskita.catbox404.dev/api/*` and overwrites `X-KelasKita-Edge-Key` with the same `EDGE_PROXY_SECRET` stored in Vercel. The active Free-plan rate rule blocks a source IP for 10 seconds after more than 20 `POST` requests to `/api/*` in 10 seconds. The application and Postgres retain their own lower, durable limits.

Generated production secrets are also stored in the operator Mac's login Keychain as generic-password items named `KelasKita:<ENVIRONMENT_VARIABLE>`. Their values must never be committed. Keychain Access may live at `/System/Library/CoreServices/Applications/Keychain Access.app` on newer macOS releases.

## 1. Create the Vercel and Supabase projects

```bash
vercel login
vercel link
```

Create a Supabase project in the region appropriate for the service's legal and latency requirements, then connect it through Vercel's Supabase integration. KelasKita uses the integration-managed `POSTGRES_URL` for its serverless connection pool and `POSTGRES_URL_NON_POOLING` for migrations; do not create duplicate database variables.

The Supabase API variables are not used by KelasKita. Database access stays inside Vercel Functions, and the migration enables RLS without public policies as defence in depth.

## 2. Create production secrets

Generate independent random values. Do not reuse one value across fields.

```bash
openssl rand -hex 32       # ABUSE_HASH_SECRET
openssl rand -base64 32    # CONTACT_ENCRYPTION_KEY
openssl rand -hex 32       # ADMIN_SESSION_SECRET
openssl rand -hex 32       # CRON_SECRET
openssl rand -hex 32       # EDGE_PROXY_SECRET
```

Choose `ADMIN_SECRET` yourself. It is the only secret you type into the site, it must be at least eight characters, and it should be saved in your password manager. Keep the generated `ADMIN_SESSION_SECRET` long; the application uses it internally and you never type it.

Add every server-only runtime field in [`.env.example`](../.env.example) to Production and Preview in Vercel, except the infrastructure-only Cloudflare fields. Add `VITE_TURNSTILE_SITE_KEY` only after step 4. `PUBLIC_ORIGIN` must be the final `https://subdomain.example.com` origin, with no trailing slash. `TURNSTILE_HOSTNAMES` is a comma-separated hostname list without schemes.

Set `OPERATOR_CONTACT_EMAIL` to one monitored address. KelasKita is exception-driven: routine reviews are automated, while unusual appeals and takedown disputes reach this address. Keep `SUBMISSIONS_OPEN=false` until the final step.

Vercel supplies an OIDC token to AI Gateway in a linked deployment. `AI_GATEWAY_API_KEY` is only needed when OIDC is unavailable. Never prefix either server credential with `VITE_`.

## 3. Apply the database migration

Pull the integration-managed production variables, then run the migration with its non-pooling connection:

```bash
vercel env pull .env.local --environment=production
node --env-file=.env.local database/migrate.mjs
```

The migration is checksummed and runs once. Do not edit `001_initial` after it has been applied; add a new migration for later changes.

## 4. Provision Turnstile and the Cloudflare edge rule

For repeatable automated provisioning, create a scoped Cloudflare API token with `Turnstile Sites Write`, `Zone WAF Write`, `Zone Rulesets Write`, `Transform Rules Write` and later `DNS Write` for the one zone. Export the account, zone, final hostname and the same `EDGE_PROXY_SECRET` stored in Vercel, then run:

```bash
npm run infra:cloudflare
```

For a new widget, this writes `.cloudflare-provisioning.json` with mode `0600`; the file is git-ignored. Copy its site key to `VITE_TURNSTILE_SITE_KEY`, its secret to `TURNSTILE_SECRET_KEY`, and the final host to `TURNSTILE_HOSTNAMES` in Vercel. Delete the local credentials file after the Vercel variables are confirmed.

The same rules can be created manually in the Cloudflare dashboard. Create a Request Header Transform Rule matching `(http.host eq "kelaskita.catbox404.dev" and starts_with(http.request.uri.path, "/api/"))`, then set the static `X-KelasKita-Edge-Key` header. Create one Rate Limiting Rule matching `(http.host eq "kelaskita.catbox404.dev" and http.request.method eq "POST" and starts_with(http.request.uri.path, "/api/"))`, grouped by IP, with 20 requests per 10 seconds and a 10-second block. Cloudflare Free currently exposes one such rule and the Block action.

Production writes reject requests without the matching server secret. Postgres independently enforces the lower product limits, so delayed or approximate edge counters cannot publish extra records.

## 5. Deploy, then ask Vercel for the DNS value

```bash
vercel deploy --prod
vercel domains add "$PUBLIC_HOSTNAME" "$VERCEL_PROJECT_NAME"
vercel domains inspect "$PUBLIC_HOSTNAME"
```

Copy the exact CNAME target shown by `vercel domains inspect`; Vercel now assigns project-specific CNAME values. Do not guess or use an example from documentation.

```bash
export VERCEL_CNAME_TARGET='the-exact-target.vercel-dns-000.com.'
npm run infra:dns
```

The DNS script creates or updates the Cloudflare CNAME and enables the proxy, which is required for the Cloudflare edge rule to see traffic. Set Cloudflare SSL/TLS to **Full (strict)**, never Flexible.

There is a deliberate trade-off: Vercel advises against stacking an external reverse proxy because it reduces Vercel Firewall visibility and can add latency or certificate complexity. If that becomes unreliable, set the CNAME to DNS-only and move the edge burst rule to Vercel Firewall; Turnstile and the durable Postgres limits still work. Never claim the Cloudflare WAF is active while the record is DNS-only.

## 6. Verify before opening submissions

Redeploy once the Turnstile public key is present, then run:

```bash
PUBLIC_ORIGIN="https://$PUBLIC_HOSTNAME" ADMIN_SECRET='the-local-copy' npm run verify:production
```

This checks the public state boundary, operator session, database, complete configuration and a real request to the configured AI Gateway model. Production currently uses `alibaba/qwen3.7-flash`. It fails closed if the credential or model is unavailable.

Then use a real browser to complete one staging submission and report. Confirm:

1. The Turnstile token is accepted once and rejected on replay.
2. The review begins pending and is absent from ratings until publication.
3. The report appears in `/moderation` on another device/session.
4. A synthetic personal-information report temporarily holds the staging review.
5. A human reason and action create a private decision and update the public feed.
6. A rejected staging review can be appealed with its one-time receipt, while a made-up receipt is rejected.
7. A direct-origin production write without the Cloudflare edge header returns 403.
8. “Run queue” and “Run live AI test” both succeed.

After the synthetic workflow passes, set `SUBMISSIONS_OPEN=true`, redeploy, and rerun production verification. The operator should periodically sample automated decisions and handle exceptional appeals or takedown disputes through the private moderation page.
