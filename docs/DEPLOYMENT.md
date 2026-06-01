# Deployment Runbook — Railway

## 0. Prerequisites
- Supabase project (Postgres + Auth + Storage)
- Stripe account (test + live)
- Resend account with a verified sending domain (`claudettescookies.shop`)
- Railway account

## 1. Database
```bash
# Link the Supabase CLI to your project, then:
supabase db push                          # applies supabase/migrations/0001-0003
psql "$DATABASE_URL" -f supabase/seed.sql # seeds real products / collections / posts
```
Confirm RLS is enabled (it is, via `0002_rls.sql`) and that the
`finalize_paid_order` / `redeem_gift_card` functions exist.

## 2. Resend
- Verify the domain; create an API key.
- Set `RESEND_FROM_EMAIL="Claudette's Cookies <hello@claudettescookies.shop>"`.
- (Optional) Add a Resend webhook → a future `/api/webhooks/resend` to ingest
  `delivered`/`opened`/`bounced` into `email_events` for richer analytics.

## 3. Stripe
- Copy `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Create a webhook endpoint → `https://<domain>/api/webhooks/stripe`
  - Events: `checkout.session.completed`
  - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## 4. Railway service
- New project → Deploy from GitHub repo. Nixpacks builds via `railway.json`.
- Add every variable from `.env.example`.
- Set `NEXT_PUBLIC_SITE_URL` to the production URL.
- Health check path: `/api/health`.

## 5. Cron (Railway scheduled jobs)
Each job is an HTTP call carrying the shared secret:

| Schedule | Method + URL | Header |
| --- | --- | --- |
| `0 * * * *` (hourly) | `POST /api/cron/abandoned-cart` | `Authorization: Bearer $CRON_SECRET` |
| `*/5 * * * *` | `POST /api/cron/scheduled-campaigns` | `Authorization: Bearer $CRON_SECRET` |

Example (Railway cron service running curl):
```bash
curl -fsS -X POST "$NEXT_PUBLIC_SITE_URL/api/cron/scheduled-campaigns" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 6. First admin login
Add your email to `ADMIN_EMAILS`, then visit `/admin/login` and request a magic
link. On first sign-in the `auth/callback` handler promotes you to `admin`.

## 7. Smoke test (post-deploy)
1. `/` loads with the 5 seeded products.
2. Add to cart → checkout → complete a Stripe **test** payment.
3. Webhook flips the order to `paid`; receipt email arrives; inventory drops by 1
   (check `/admin/products`).
4. Buy a gift card → recipient email arrives with a `CLDT-…` code.
5. Newsletter signup → welcome email; subscriber appears in `/admin/marketing`.
6. Create + "Send now" a campaign → it lands and is logged in `email_events`.

## Rollback
Railway keeps prior deploys — redeploy the last green build. Schema changes are
forward-only; write a new migration to revert rather than editing old ones.
