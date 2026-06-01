import { env } from "@/lib/env";

/**
 * Cron endpoints are public HTTP routes, so they must authenticate the caller.
 * Railway Cron is configured to send `Authorization: Bearer ${CRON_SECRET}`.
 */
export function isAuthorizedCron(req: Request): boolean {
  // Fail closed: with no secret configured, no caller can be authorized.
  if (!env.CRON_SECRET) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${env.CRON_SECRET}`;
}
