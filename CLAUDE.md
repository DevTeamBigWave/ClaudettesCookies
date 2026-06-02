# Claudette's Cookies — working notes

## Preferences
- **Always deliver SQL as a downloadable file** (via file attachment), never pasted
  inline in chat. Applies to seeds, migrations, ad-hoc queries — anything the user
  needs to run in Supabase's SQL Editor.

## Stack / deploy
- Next.js (App Router) storefront, deployed on **Railway** (`production.up.railway.app`).
- Data in **Supabase**; storefront reads run with the anon key under RLS.
- Product/lifestyle photos are self-hosted in `public/products` and `public/lifestyle`
  (tall 2:3 portraits, 1365×2048) and referenced by local paths (e.g. `/products/intro.jpeg`).
- DB schema + RLS + seed live in `supabase/migrations/` and `supabase/seed.sql`.
  Seed is idempotent (`on conflict do nothing/update`) and safe to re-run.
