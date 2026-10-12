import { route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { rangeSchema } from "@/lib/validators";
import { salesReport } from "@/services/reports";

export const GET = route(async (req) => {
  const user = await requireRole("cajero", "admin");
  const { from, to } = rangeSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  // Costos y ganancia solo para administración.
  return salesReport(from, to, user.role === "admin");
});
