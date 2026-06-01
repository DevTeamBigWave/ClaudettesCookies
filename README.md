# Claudette's Cookies 🍪

A production e-commerce platform for [Claudette's Cookies](https://claudettescookies.shop) —
a custom storefront **and** a full admin dashboard (orders, products, customers, email
marketing, promotions, gift cards, and a blog).

> Four flavors. Zero compromise.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (brand-tokenized, swappable) |
| Database | Supabase Postgres + Row Level Security |
| Auth | Supabase Auth (magic link) |
| Payments | Stripe Checkout + webhooks |
| Email | Resend (transactional + in-house marketing campaigns) |
| Jobs | Railway Cron → authenticated `/api/cron/*` |
| Hosting | Railway |

Full design rationale in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What's built

**Storefront** (`src/app/(shop)`)
- Home, shop, product detail, cart (localStorage), gift cards, blog, about
- Stripe-hosted checkout; server-side re-pricing (never trusts the client cart)
- Newsletter capture with welcome email + 10% code

**Admin** (`src/app/admin`)
- Magic-link login; `ADMIN_EMAILS` are auto-promoted to the `admin` role
- Dashboard KPIs (30-day revenue, AOV, customers, subscribers)
- Orders, customers, products (status + inventory), gift-card liability
- **Email marketing**: compose → schedule/send campaigns via Resend, with open
  tracking, segments, and one-click unsubscribe
- Promotions (discount codes) and a Markdown blog composer

**Commerce engine** (`src/app/api`, `src/lib`)
- `POST /api/checkout` — re-prices from the DB, validates inventory + discounts,
  creates a pending order, opens a Stripe Checkout Session
- `POST /api/webhooks/stripe` — signature-verified, **idempotent**; the only place
  an order becomes `paid`. Decrements inventory + sends the receipt atomically
- Gift-card purchase/fulfillment, abandoned-cart + scheduled-campaign cron

## Local development

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local   # fill in Supabase, Stripe, Resend, CRON_SECRET

# 3. Apply the schema + seed (real product data) to your Supabase project
supabase db push                                   # runs supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql          # or: npm run db:seed

# 4. Run
npm run dev                                         # http://localhost:3000
npm run stripe:listen                               # forward Stripe webhooks
```

Sign in to the admin at `/admin/login` with an email listed in `ADMIN_EMAILS`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run stripe:listen` | Forward Stripe webhooks locally |

## Deployment (Railway)

1. Create a Railway project from this repo (Nixpacks; see `railway.json`).
2. Add all variables from `.env.example` to the service.
3. Point a Stripe webhook at `https://<domain>/api/webhooks/stripe`
   (event: `checkout.session.completed`) and set `STRIPE_WEBHOOK_SECRET`.
4. Add two Railway Cron schedules, each sending `Authorization: Bearer $CRON_SECRET`:
   - hourly → `POST /api/cron/abandoned-cart`
   - every 5 min → `POST /api/cron/scheduled-campaigns`
5. Health check: `/api/health`.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full runbook.

## Notes for the team

- **Money is integer cents** everywhere (DB, Stripe, UI). Never floats.
- **Branding** flows from CSS variables in `src/app/globals.css` — drop in the
  official brand guide there and the whole app re-themes.
- Product imagery currently references the Shopify CDN (from the live store);
  migrate to Supabase Storage and update `product_images.url` when ready.
- The founder story / About copy has a placeholder paragraph awaiting final copy.
