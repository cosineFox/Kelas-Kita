# Production deployment

Do not open submissions until every verification in this document passes and the two human launch gates are signed.

## 1. Create the Vercel and Supabase projects

```bash
vercel login
vercel link
```

Create a Supabase project in the region appropriate for the service's legal and latency requirements. In **Connect → Transaction pooler**, copy the port `6543` connection string into Vercel as `DATABASE_URL`. Transaction mode is intended for serverless traffic and the application disables prepared statements accordingly.

Do not add `SUPABASE_URL`, an anon key or a service-role key. KelasKita does not use Supabase Auth or the browser Data API; all database access stays inside Vercel Functions. The migration enables RLS without public policies as defence in depth.

## 2. Create production secrets

Generate independent random values. Do not reuse one value across fields.

```bash
openssl rand -hex 32       # ABUSE_HASH_SECRET
openssl rand -base64 32    # CONTACT_ENCRYPTION_KEY
openssl rand -hex 32       # ADMIN_SECRET
openssl rand -hex 32       # ADMIN_SESSION_SECRET
openssl rand -hex 32       # CRON_SECRET
openssl rand -hex 32       # EDGE_PROXY_SECRET
```

Add every server-only runtime field in [`.env.example`](../.env.example) to Production and Preview in Vercel, except `MIGRATION_DATABASE_URL` and the infrastructure-only Cloudflare fields. Add `VITE_TURNSTILE_SITE_KEY` only after step 4. `PUBLIC_ORIGIN` must be the final `https://subdomain.example.com` origin, with no trailing slash. `TURNSTILE_HOSTNAMES` is a comma-separated hostname list without schemes.

Set `OPERATOR_CONTACT_EMAIL`, `URGENT_REMOVAL_PRIMARY` and `URGENT_REMOVAL_BACKUP` to real, monitored values. They are health gates, not decorative metadata. Keep `SUBMISSIONS_OPEN=false` until the final step.

Vercel supplies an OIDC token to AI Gateway in a linked deployment. `AI_GATEWAY_API_KEY` is only needed when OIDC is unavailable. Never prefix either server credential with `VITE_`.

## 3. Apply the database migration

Use Supabase's Direct connection string for this one-off administrative task. If the local network cannot reach the IPv6 direct endpoint, use the port `5432` Session pooler connection instead. Put it in the git-ignored `.env.local` as `MIGRATION_DATABASE_URL`, then run `node --env-file=.env.local database/migrate.mjs`.

Do not store `MIGRATION_DATABASE_URL` in Vercel. Delete it from `.env.local` when the migration succeeds.

The migration is checksummed and runs once. Do not edit `001_initial` after it has been applied; add a new migration for later changes.

## 4. Provision Turnstile and the Cloudflare edge rule

Create a scoped Cloudflare API token with `Turnstile Sites Write`, `Zone WAF Write`, `Zone Rulesets Write`, `Transform Rules Write` and later `DNS Write` for the one zone. Export the account, zone, final hostname and the same `EDGE_PROXY_SECRET` stored in Vercel, then run:

```bash
npm run infra:cloudflare
```

For a new widget, this writes `.cloudflare-provisioning.json` with mode `0600`; the file is git-ignored. Copy its site key to `VITE_TURNSTILE_SITE_KEY`, its secret to `TURNSTILE_SECRET_KEY`, and the final host to `TURNSTILE_HOSTNAMES` in Vercel. Delete the local credentials file after the Vercel variables are confirmed.

The script also creates one Cloudflare rate rule for bursts above 20 API writes in 10 seconds per edge location and source IP. A request-header transform overwrites `X-KelasKita-Edge-Key` before `/api/` reaches Vercel; production writes reject requests without the matching server secret. This prevents direct-origin requests from bypassing the Cloudflare layer. Postgres independently enforces the lower product limits, so delayed or approximate edge counters cannot publish extra records.

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

This checks the public state boundary, operator session, database, complete configuration and a real `thinkingmachines/inkling-small` AI Gateway request. It fails closed if the credential or model is unavailable.

Then use a real browser to complete one staging submission and report. Confirm:

1. The Turnstile token is accepted once and rejected on replay.
2. The review begins pending and is absent from ratings until publication.
3. The report appears in `/moderation` on another device/session.
4. A synthetic personal-information report temporarily holds the staging review.
5. A human reason and action create a private decision and update the public feed.
6. A rejected staging review can be appealed with its one-time receipt, while a made-up receipt is rejected.
7. A direct-origin production write without the Cloudflare edge header returns 403.
8. “Run queue” and “Run live AI test” both succeed.

Finally complete the legal gate and urgent-removal drill. Record their real ISO timestamps in `LEGAL_REVIEW_SIGNED_AT` and `URGENT_ROTA_TESTED_AT`, set `SUBMISSIONS_OPEN=true`, redeploy, and rerun the production verification. A successful deployment alone is not launch authorisation.
