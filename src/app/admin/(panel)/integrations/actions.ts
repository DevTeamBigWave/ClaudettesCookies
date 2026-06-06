"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { GOOGLE_CALENDAR_INTEGRATION, deleteIntegration } from "@/lib/integrations";
import { revokeStoredToken, testCalendarConnection } from "@/lib/google-calendar";

export async function disconnectGoogle() {
  await requireAdmin();
  await revokeStoredToken(); // best-effort revoke at Google + clear token cache
  await deleteIntegration(GOOGLE_CALENDAR_INTEGRATION);
  revalidatePath("/admin/integrations");
}

export async function testGoogle(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  return testCalendarConnection();
}
