import { route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import * as promos from "@/services/promotions";

export const DELETE = route(async (_req, { params }) => {
  await requireRole("admin");
  await promos.remove((await params).id);
  return { ok: true };
});
