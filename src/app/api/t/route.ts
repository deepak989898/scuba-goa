import { POST as trackPost } from "@/app/api/analytics/track/route";

export const runtime = "nodejs";

/**
 * Short alias for analytics ingest — `/api/analytics/track` is often blocked by
 * ad blockers / Brave. Clients should prefer this path.
 */
export async function POST(req: Request) {
  return trackPost(req);
}
