# Brand assets — what's where

Everything from the Claudette's brand guide is wired into the app. This is the
map of where each piece lives.

## Colors → `src/app/globals.css`
The official palette lives as HSL design tokens; every component re-themes from
this one file.

| Token | Color | Hex |
|-------|-------|-----|
| `--background` | Cream | `#F5F1EB` |
| `--primary` | Paprika | `#FC480F` |
| `--foreground` / `--maroon` | Maroon | `#7B0B0B` |
| `--brown` | Brown | `#683010` |
| `--tan` | Tan | `#C49A55` |
| `--accent` / yellow | Yellow | `#FBD550` |
| `--pink` | Pink | `#FFAA98` |
| `--cornflower` | Cornflower | `#8BAEE2` |
| `--navy` | Navy | `#313168` |

## Fonts → `src/app/fonts/`
Self-hosted via `next/font/local` in `src/app/layout.tsx`:

| File | Role | Token |
|------|------|-------|
| `mabry-regular.otf` / `mabry-italic.otf` | Body text | `--font-sans` |
| `GT-Alpina-Standard-Regular.otf` / `…-Italic.otf` | Headlines | `--font-display` |
| `central-avenue-bold.otf` | Deco display accent | `--font-deco` |
| `Cadet-Bold.otf` | Logo wordmark (reserve) | — |

## Logo → `public/brand/`
- `claudettes-badge.png` — circular badge, used in the site header.
- The horizontal lockup is in `docs/brand/claudettes-logo-horizontal.pdf`
  (vector). Needs a PNG/SVG export before it can be used on the web.

## Photography
- `public/products/` — the five box shots, one per SKU
  (`intro`, `sicilian`, `disco`, `lunchbox`, `sunday`). Referenced from
  `supabase/seed.sql` and migration `0004_localize_product_images.sql`.
- `public/lifestyle/` — editorial/mood shots (`milk-splash`, `choc-stack`,
  `cooling-rack`, `choc-chip`, `box`, `box-overhead`) used on the homepage
  editorial band and the About page.

## Reference PDFs → `docs/brand/`
The original brand-guide PDFs (`brand-guidelines-2024.pdf`, `color-palette.pdf`,
`typography.pdf`, `claudettes-logo-horizontal.pdf`) are kept here for reference.
