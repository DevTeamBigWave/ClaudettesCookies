# Claudette's Cookies — working notes

## Preferences
- **Always deliver SQL as copy-paste text in the chat** (a fenced ```sql block the
  user can select and copy), for every seed, migration, or ad-hoc query they need to
  run in Supabase's SQL Editor. Offer a downloadable file as an extra only if asked.
- **Always push everything to `main`.** After committing on the feature branch,
  fast-forward `main` to it and push (`git push origin <branch>:main`) so Railway
  deploys — no need to ask each time.

## Stack / deploy
- Next.js (App Router) storefront hosted on **Railway**, served at the custom
  domain **`https://www.claudettescookies.shop`** (set as `NEXT_PUBLIC_SITE_URL`;
  this is the canonical URL used for webhooks, OAuth redirects, sitemap, and
  emails). The apex **`claudettescookies.shop`** 301-redirects to `www` via
  GoDaddy domain forwarding (GoDaddy can't CNAME the apex to Railway). The
  Railway-generated `https://claudettescookies-production.up.railway.app` URL
  still resolves as the underlying origin. Railway service is `ClaudettesCookies`,
  listens on port 8080, deploys from `main`.
- Data in **Supabase**; storefront reads run with the anon key under RLS.
- Product/lifestyle photos are self-hosted in `public/products` and `public/lifestyle`
  (tall 2:3 portraits, 1365×2048) and referenced by local paths (e.g. `/products/intro.jpeg`).
- DB schema + RLS + seed live in `supabase/migrations/` and `supabase/seed.sql`.
  Seed is idempotent (`on conflict do nothing/update`) and safe to re-run.
