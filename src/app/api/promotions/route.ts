import { isoDay } from "@/lib/format";
import { body, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { promotionSchema } from "@/lib/validators";
import * as promos from "@/services/promotions";

export const GET = route(async (req) => {
  await requireRole();
  const day = new URL(req.url).searchParams.get("day");
  return promos.listForDay(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : isoDay());
});

export const POST = route(async (req) => {
  await requireRole("admin");
  const p = await promos.create(promotionSchema.parse(await body(req)));
  return { _id: p._id };
});
