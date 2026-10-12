import { body, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { createOrderSchema } from "@/lib/validators";
import { createOrAppend, listOpen } from "@/services/orders";

export const GET = route(async () => {
  await requireRole();
  return listOpen();
});

export const POST = route(async (req) => {
  const user = await requireRole();
  const { table, items } = createOrderSchema.parse(await body(req));
  const order = await createOrAppend(user, table, items);
  return { _id: order._id, number: order.number };
});
