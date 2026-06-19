import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { ProductWithRelations } from "@/types/db";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const image = product.product_images?.[0];

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍪</div>
        )}
        {product.featured && (
          <Badge variant="accent" className="absolute left-3 top-3">
            Best Seller
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug">{product.title}</h3>
        {product.subtitle && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.subtitle}</p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-semibold">{formatMoney(product.price_cents)}</span>
          <span className="text-sm font-medium text-primary group-hover:underline">View →</span>
        </div>
      </div>
    </Link>
  );
}
