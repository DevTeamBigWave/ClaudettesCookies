/**
 * Database types. In CI these are regenerated from the live schema with:
 *   supabase gen types typescript --project-id <id> > src/types/db.ts
 * Hand-maintained here so the app is fully typed without a DB connection.
 */

export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";
export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
export type GiftCardStatus = "active" | "redeemed" | "disabled" | "expired";
export type PostStatus = "draft" | "published";
export type SubscriberStatus = "subscribed" | "unsubscribed" | "cleaned" | "pending";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type UserRole = "customer" | "staff" | "admin";

export interface Product {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: ProductStatus;
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  featured: boolean;
  ingredients: string | null;
  allergens: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  inventory_qty: number;
  position: number;
  created_at: string;
}

export type ProductWithRelations = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export interface Order {
  id: string;
  order_number: number;
  customer_id: string | null;
  email: string;
  status: OrderStatus;
  fulfillment: FulfillmentStatus;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  gift_card_cents: number;
  total_cents: number;
  discount_id: string | null;
  discount_code: string | null;
  shipping_address: Record<string, unknown> | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  title: string;
  variant_title: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
}

export interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  min_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  once_per_customer: boolean;
  active: boolean;
  created_at: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initial_cents: number;
  balance_cents: number;
  currency: string;
  status: GiftCardStatus;
  purchaser_email: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  gift_message: string | null;
  order_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  author_name: string;
  status: PostStatus;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  full_name: string | null;
  status: SubscriberStatus;
  source: string | null;
  customer_id: string | null;
  tags: string[];
  unsubscribe_token: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  from_name: string | null;
  body_html: string;
  body_markdown: string | null;
  status: CampaignStatus;
  segment: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Minimal Database surface for @supabase/ssr generics. Tables are typed loosely
 * (Row only) where the app reads them; privileged writes go through the admin
 * client which we cast at the call site.
 */
export interface Database {
  public: {
    Tables: {
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      product_images: { Row: ProductImage; Insert: Partial<ProductImage>; Update: Partial<ProductImage> };
      product_variants: { Row: ProductVariant; Insert: Partial<ProductVariant>; Update: Partial<ProductVariant> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> };
      discounts: { Row: Discount; Insert: Partial<Discount>; Update: Partial<Discount> };
      gift_cards: { Row: GiftCard; Insert: Partial<GiftCard>; Update: Partial<GiftCard> };
      blog_posts: { Row: BlogPost; Insert: Partial<BlogPost>; Update: Partial<BlogPost> };
      email_subscribers: { Row: EmailSubscriber; Insert: Partial<EmailSubscriber>; Update: Partial<EmailSubscriber> };
      email_campaigns: { Row: EmailCampaign; Insert: Partial<EmailCampaign>; Update: Partial<EmailCampaign> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
    };
    Functions: {
      finalize_paid_order: { Args: { p_order_id: string; p_payment_intent: string }; Returns: boolean };
      redeem_gift_card: { Args: { p_code: string; p_amount_cents: number; p_order_id: string }; Returns: number };
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
