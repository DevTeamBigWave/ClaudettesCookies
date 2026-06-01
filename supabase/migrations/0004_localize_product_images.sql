-- ============================================================================
-- Re-host product imagery from the Shopify CDN to self-hosted assets under
-- /public/products. Idempotent: re-running simply re-sets the same URLs.
-- ============================================================================

update product_images set url = '/products/intro.jpeg',    alt = 'The Intro — a pink box with all four signature flavors'
  where product_id = '22222222-2222-2222-2222-222222222201' and position = 0;
update product_images set url = '/products/sicilian.jpeg', alt = 'The Sicilian Stash — four pistachio cookies in a box'
  where product_id = '22222222-2222-2222-2222-222222222202' and position = 0;
update product_images set url = '/products/disco.jpeg',    alt = 'The Disco Drop — chocolate-dipped oat & banana cookies'
  where product_id = '22222222-2222-2222-2222-222222222203' and position = 0;
update product_images set url = '/products/lunchbox.jpeg', alt = 'The Lunchbox — four Afterschool PB&J cookies'
  where product_id = '22222222-2222-2222-2222-222222222204' and position = 0;
update product_images set url = '/products/sunday.jpeg',   alt = 'The Sunday Ritual — chocolate chip walnut cookies'
  where product_id = '22222222-2222-2222-2222-222222222205' and position = 0;
