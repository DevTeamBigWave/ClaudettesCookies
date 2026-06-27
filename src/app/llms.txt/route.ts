/**
 * /llms.txt — a clean markdown brief for AI answer engines (ChatGPT, Perplexity,
 * Google AI Overviews). Every fact here is drawn from the site itself; absolute
 * URLs use the canonical production domain.
 */
export const dynamic = "force-static";

export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.claudettescookies.shop";

  const body = `# Claudette's Cookies

> Small-batch cookies baked with grass-fed butter, organic flour, and zero seed oils — Moroccan-inspired flavors, baked to order and shipped nationwide. "Cookies before chemistry. Everybody eats."

Claudette's Cookies is a family-run cookie company founded by Claudette Flatow. After running five Queens, NY kitchens from 2012 to 2026 and feeding the Rockaway Park community, the family now bakes small-batch cookies to order and ships them across the United States, with local pickup available in Rockaway Park, NY.

## What we offer
- Signature cookie boxes — six cookies per box, $45, baked to order
- Build Your Own Box — choose your own mix of six cookies
- Naturally gluten-free options (the Disco Drop, and the flourless Lunchbox PB&J)
- Gift cards
- Nationwide U.S. shipping (flat-rate Standard $10 / Express $20; free over $50) and free local pickup

## What makes us different
- No seed oils — grass-fed butter and organic flour only
- No gums and no mystery "natural flavors" — every ingredient is listed on our Clean Label page
- Moroccan-inspired flavors; baked to order, never sitting on a shelf

## Service area
United States (nationwide shipping). Free local pickup in Rockaway Park, NY.

## Contact
- Email: hello@claudettescookies.shop
- Instagram: https://www.instagram.com/claudettescookies
- Website: ${base}

## Key pages
- Shop all boxes: ${base}/shop
- Clean Label (full ingredients): ${base}/clean-label
- Our Story: ${base}/about
- Journal: ${base}/blog
- Gift Cards: ${base}/gift-cards
- Sitemap: ${base}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
