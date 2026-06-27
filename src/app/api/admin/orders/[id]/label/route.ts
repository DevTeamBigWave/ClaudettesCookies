import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLabel, isLabelProviderConfigured } from "@/lib/labels";
import { packageWeightLb } from "@/lib/shipping";

export const runtime = "nodejs";

const BUCKET = "shipping-labels";

type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type ShippingAddress = { name?: string | null; phone?: string | null; address?: StripeAddress } | null;

async function requireStaff() {
  const profile = await getProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) return null;
  return profile;
}

/** Generate a real FedEx label for a paid order and store the PDF. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isLabelProviderConfigured()) {
    return NextResponse.json(
      { error: "No label provider configured (set SHIPPO_API_TOKEN or the FEDEX_* env vars)." },
      { status: 422 },
    );
  }

  const { id } = await params;
  const db = createAdminClient();

  const { data: order } = await db
    .from("orders")
    .select("id, status, shipping_address, shipping_service")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "paid" && order.status !== "fulfilled") {
    return NextResponse.json({ error: "Order isn't paid yet." }, { status: 422 });
  }

  const ship = order.shipping_address as ShippingAddress;
  const addr = ship?.address;
  if (!addr?.line1 || !addr.city || !addr.state || !addr.postal_code) {
    return NextResponse.json({ error: "Order has no complete shipping address." }, { status: 422 });
  }

  const { data: items } = await db.from("order_items").select("variant_id, quantity").eq("order_id", id);
  const weightLb = await packageWeightLb(
    db,
    (items ?? [])
      .filter((i) => i.variant_id)
      .map((i) => ({ variantId: i.variant_id as string, quantity: i.quantity as number })),
  );

  let label;
  try {
    label = await generateLabel({
      recipient: {
        name: ship?.name || "Customer",
        phone: ship?.phone,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
      },
      weightLb,
      serviceType: order.shipping_service ?? undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Label generation failed" },
      { status: 502 },
    );
  }

  const path = `${id}.pdf`;
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(path, Buffer.from(label.labelBase64, "base64"), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    return NextResponse.json({ error: `Could not store label: ${uploadErr.message}` }, { status: 500 });
  }

  await db
    .from("orders")
    .update({
      tracking_number: label.trackingNumber,
      shipping_carrier: label.carrier,
      label_path: path,
      label_generated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Store the USPS QR code URL separately so a not-yet-applied migration 0018
  // can't fail the critical tracking/label update above.
  if (label.qrCodeUrl) {
    const { error: qrErr } = await db
      .from("orders")
      .update({ label_qr_url: label.qrCodeUrl })
      .eq("id", id);
    if (qrErr) console.error("Could not store QR url (run migration 0018):", qrErr.message);
  }

  return NextResponse.json({
    trackingNumber: label.trackingNumber,
    carrier: label.carrier,
    qrCodeUrl: label.qrCodeUrl,
  });
}

/** Hand back a short-lived signed URL to download the stored label PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("label_path").eq("id", id).maybeSingle();
  if (!order?.label_path) return NextResponse.json({ error: "No label yet" }, { status: 404 });

  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(order.label_path, 60);
  if (error || !data) {
    return NextResponse.json({ error: "Could not sign label URL" }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
