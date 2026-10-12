import { body, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { tablesSchema } from "@/lib/validators";
import { getTableCount, setTableCount } from "@/services/tables";

export const GET = route(async () => {
  await requireRole();
  return { count: await getTableCount() };
});

export const PATCH = route(async (req) => {
  await requireRole("admin");
  const { count } = tablesSchema.parse(await body(req));
  return { count: await setTableCount(count) };
});
