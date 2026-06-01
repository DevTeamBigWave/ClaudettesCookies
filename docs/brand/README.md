# Brand assets — where things go

This is the home for everything from the Claudette's brand guide. Drop files in
the right folder and they get wired into the app.

## 1. Fonts → `src/app/fonts/`
Put the actual font files here (`.woff2` strongly preferred; `.ttf`/`.otf` also
fine). Next.js self-hosts them via `next/font/local` — fast, no external CDN, no
layout shift.

Name them clearly, e.g.:
```
src/app/fonts/
  Heading-Regular.woff2
  Heading-Bold.woff2
  Body-Regular.woff2
  Body-Medium.woff2
```
Tell me which family is for **headings** vs **body** and I'll register them in
`src/app/layout.tsx` (they already map to the `--font-display` and `--font-sans`
tokens the whole UI uses).

## 2. Brand guide → `docs/brand/`
Drop the brand guide PDF here (e.g. `docs/brand/brand-guide.pdf`). I can read it
directly to pull the exact hex colors, type scale, spacing, and voice — so I
don't have to guess.

## 3. Logo & shipped imagery → `public/brand/`
Anything served to visitors:
```
public/brand/
  logo.svg            # primary wordmark/logo (SVG ideal)
  logo-mark.svg       # icon-only version (for the header on mobile)
  favicon.ico
  og-image.jpg        # 1200×630 social share image
```
These get referenced in the header, footer, and metadata.

---

### Colors live in code, not here
The actual color values live as design tokens in `src/app/globals.css`. Once I
read the brand guide PDF I'll set them there — every component re-themes from
that one file.
