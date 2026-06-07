import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AddToCart } from "@/components/shop/add-to-cart";
import { BuildYourOwn } from "@/components/shop/build-your-own";
import { JsonLd } from "@/components/seo/json-ld";
import { productSchema, breadcrumbSchema } from "@/lib/seo";
import {
  getProductByHandle,
  getFlavors,
  BUILD_YOUR_OWN_HANDLE,
  BOX_SIZE,
} from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const revalidate = 300;

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product) return { title: "Not found" };
  return {
    title: product.seo_title ?? product.title,
    description: product.seo_description ?? product.subtitle ?? undefined,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      type: "website",
      title: product.seo_title ?? product.title,
      description: product.seo_description ?? product.subtitle ?? undefined,
      images: product.product_images?.[0]?.url ? [product.product_images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product || product.status !== "active") notFound();

  const variant = product.product_variants?.[0];
  const image = product.product_images?.[0];
  const soldOut = !variant || variant.inventory_qty <= 0;
  const isBuildYourOwn = product.handle === BUILD_YOUR_OWN_HANDLE;
  const flavors = isBuildYourOwn ? await getFlavors() : [];

  return (
    <div className="container grid gap-12 py-14 md:grid-cols-2">
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema([
            { name: "Shop", path: "/shop" },
            { name: product.title, path: `/products/${product.handle}` },
          ]),
        ]}
      />
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-secondary">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🍪</div>
        )}
      </div>

      <div className="flex flex-col">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/shop" className="hover:text-primary">Shop</Link>
          <span className="mx-2">/</span>
          <span>{product.title}</span>
        </nav>

        <h1 className="font-display text-4xl font-semibold leading-tight">{product.title}</h1>
        {product.subtitle && (
          <p className="mt-2 text-lg text-primary">{product.subtitle}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <span className="text-2xl font-semibold">{formatMoney(product.price_cents)}</span>
          {product.compare_at_cents && product.compare_at_cents > product.price_cents && (
            <span className="text-muted-foreground line-through">
              {formatMoney(product.compare_at_cents)}
            </span>
          )}
          {!soldOut && variant.inventory_qty <= 6 && (
            <Badge variant="accent">Only {variant.inventory_qty} left</Badge>
          )}
        </div>

        {product.description && (
          <p className="mt-6 leading-relaxed text-foreground/90">{product.description}</p>
        )}

        {product.allergens && product.allergens.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {product.allergens.map((a) => (
              <Badge key={a} variant="secondary">{a}</Badge>
            ))}
          </div>
        )}

        <div className="mt-8 max-w-sm">
          {isBuildYourOwn && variant ? (
            <BuildYourOwn
              boxSize={BOX_SIZE}
              flavors={flavors}
              box={{
                variantId: variant.id,
                productId: product.id,
                handle: product.handle,
                title: product.title,
                unitPriceCents: variant.price_cents,
                image: image?.url ?? null,
              }}
            />
          ) : (
            variant && (
              <AddToCart
                soldOut={soldOut}
                line={{
                  variantId: variant.id,
                  productId: product.id,
                  handle: product.handle,
                  title: product.title,
                  variantTitle: variant.title,
                  unitPriceCents: variant.price_cents,
                  image: image?.url ?? null,
                }}
              />
            )
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Free shipping on orders over {formatMoney(5000)} · Baked to order
          </p>
        </div>
      </div>
    </div>
  );
}
