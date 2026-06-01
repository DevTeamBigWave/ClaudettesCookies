import { env } from "@/lib/env";

/**
 * Cron endpoints are public HTTP routes, so they must authenticate the caller.
 * Railway Cron is configured to send `Authorization: Bearer ${CRON_SECRET}`.
 */
export function isAuthorizedCron(req: Request): boolean {
  const header = req.headers.get("authorization");
  return header === `Bearer ${env.CRON_SECRET}`;
}
