# Claudette's Cookies — System Architecture

A fully custom, owned-data e-commerce platform: a marketing storefront + a full
admin dashboard, built to start lean on Railway and scale to millions of orders
without a re-platform.

---

## 1. Goals & constraints

| Driver | Decision |
| --- | --- |
| Own our customer & order data | Postgres (Supabase) as the system of record — not a Shopify lock-in |
| Don't re-own PCI | Stripe Checkout / Payment Intents; card data never touches our servers |
| Lean MVP, scalable later | One Next.js app, stateless, horizontally scalable behind Railway |
| Email marketing we control | Resend for delivery + our own campaign/segment/automation engine |
| Underperforming store → growth | First-class promotions, gift cards, blog/SEO, abandoned-cart automation |

## 2. High-level diagram

```
                    ┌──────────────────────────────────────────┐
                    │              Browser (React)              │
                    │  Storefront (SSR/RSC)   Admin dashboard   │
                    └───────────────┬──────────────────────────┘
                                    │ HTTPS
                    ┌───────────────▼──────────────────────────┐
                    │        Next.js 15 (App Router)            │
                    │  • RSC pages (storefront + admin)         │
                    │  • Route handlers = REST API (/api/*)     │
                    │  • Middleware: Supabase session + admin   │
                    │    guard + security headers               │
                    │            Hosted on Railway              │
                    └───┬───────────┬───────────┬───────────┬───┘
                        │           │           │           │
          ┌─────────────▼──┐  ┌─────▼─────┐ ┌───▼─────┐ ┌───▼───────────┐
          │   Supabase     │  │  Stripe   │ │ Resend  │ │ Railway Cron   │
          │  Postgres+RLS  │  │ Checkout  │ │ Email   │ │ (scheduler)    │
          │  Auth, Storage │  │ Webhooks  │ │ API     │ │ → /api/cron/*  │
          └────────────────┘  └───────────┘ └─────────┘ └────────────────┘
```

## 3. Tech stack

- **Framework:** Next.js 15 (App Router, React 19 Server Components, route handlers).
- **Language:** TypeScript end-to-end, Zod for runtime validation at every boundary.
- **Styling/UI:** Tailwind CSS + shadcn/ui (Radix primitives). All brand color/typography
  flows from CSS variables → re-theme in one file.
- **Data:** Supabase Postgres (system of record), Row Level Security on every table,
  Supabase Auth (email magic-link + password), Supabase Storage for product/blog imagery.
- **Payments:** Stripe Checkout Sessions for cart purchases and gift cards; Stripe
  webhooks are the *only* thing that flips an order to `paid` (never the browser).
- **Email:** Resend for transactional (receipts, shipping, gift-card delivery) and for
  marketing campaign blasts. Campaigns, segments, and automations are our own tables.
- **Jobs:** Railway Cron hits authenticated `/api/cron/*` endpoints (abandoned cart,
  scheduled campaign dispatch, gift-card expiry sweeps).
- **Hosting:** Railway (web service + cron). Stateless app → scale horizontally.

## 4. Request lifecycle: checkout (the critical path)

1. Client holds the cart in `localStorage` (Zustand). No server round-trips while browsing.
2. On checkout, the browser POSTs the cart to `POST /api/checkout`.
3. The server **re-prices every line from the DB** (never trusts client prices),
   validates inventory, applies any promo code, and creates an `orders` row in
   `pending` state plus a Stripe Checkout Session.
4. Browser redirects to Stripe-hosted checkout (PCI handled by Stripe).
5. Stripe fires `checkout.session.completed` → `POST /api/webhooks/stripe`
   (signature-verified). The handler is **idempotent** (keyed on the Stripe event id),
   marks the order `paid`, decrements inventory, redeems gift cards, and enqueues the
   receipt email. This is the single source of truth for "an order happened."
6. Customer lands on `/checkout/success?order=...`.

> Inventory is only ever decremented inside the webhook transaction, so a closed tab
> or a double-submit can never oversell or double-charge.

## 5. Security model

- **RLS everywhere.** Anonymous/auth'd clients can read published products, posts, and
  their own orders only. All writes that matter happen server-side with the service-role
  key inside route handlers — never from the browser.
- **Admin guard** lives in `middleware.ts` + a server-side `requireAdmin()` check. The
  `admin` role is stored on `profiles.role`; bootstrap admins come from `ADMIN_EMAILS`.
- **Webhooks** verify Stripe signatures; **cron** endpoints require a bearer `CRON_SECRET`.
- **Money is integer cents** in the DB and Stripe — no floats.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`) are
  server-only and validated at boot by `src/lib/env.ts`.

## 6. Scaling path (lean now → millions later)

| Concern | MVP (now) | At scale |
| --- | --- | --- |
| Web tier | 1 Railway service | N replicas (stateless) behind LB |
| DB | Supabase Postgres | Read replicas, PgBouncer pooling, partition `orders`/`email_events` by month |
| Product reads | RSC + Next data cache | + CDN edge cache, ISR revalidation |
| Email blasts | cron dispatch in batches of 100 | queue/worker (Railway worker) + provider rate limits |
| Media | Supabase Storage | Storage + CDN, responsive transforms |
| Search | Postgres `tsvector` | Dedicated search (Typesense/Meilisearch) |

Because the data model is ours and stateless, each step is additive — no re-platform.

## 7. Module boundaries

```
src/lib/supabase/*  → the only place clients are constructed (browser/server/admin)
src/lib/data/*      → typed read queries (products, posts, orders) reused by RSC + API
src/lib/{stripe,resend,env,utils}.ts → external service edges, validated config
src/app/api/*       → all writes; thin handlers that call into lib + validate with Zod
src/app/(shop)/*    → public storefront (RSC-first)
src/app/admin/*     → authenticated dashboard (guarded)
```

See `docs/DATA_MODEL.md` for the schema and `docs/API.md` for the endpoint contract.
