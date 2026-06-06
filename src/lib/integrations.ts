import { createAdminClient } from "@/lib/supabase/admin";

/** Stable row id for the Google Calendar integration in the `integrations` table. */
export const GOOGLE_CALENDAR_INTEGRATION = "google_calendar";

export interface IntegrationRow {
  id: string;
  status: "connected" | "disconnected" | "error";
  account_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  last_error: string | null;
  connected_at: string | null;
  updated_at: string;
}

export async function getIntegration(id: string): Promise<IntegrationRow | null> {
  const db = createAdminClient();
  const { data } = await db.from("integrations").select("*").eq("id", id).maybeSingle();
  return (data as IntegrationRow | null) ?? null;
}

export async function upsertIntegration(
  id: string,
  patch: Partial<Omit<IntegrationRow, "id" | "updated_at">>,
): Promise<void> {
  const db = createAdminClient();
  await db
    .from("integrations")
    .upsert({ id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" });
}

export async function deleteIntegration(id: string): Promise<void> {
  const db = createAdminClient();
  await db.from("integrations").delete().eq("id", id);
}
