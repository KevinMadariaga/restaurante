import { body, HttpError, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { orderActionSchema } from "@/lib/validators";
import { addItems, cancel, deliver, pay, removeItem, serve, STAFF } from "@/services/orders";

export const PATCH = route(async (req, { params }) => {
  const user = await requireRole();
  const { id } = await params;
  const input = orderActionSchema.parse(await body(req));
  const staffOnly = input.action === "serve" || input.action === "pay" || input.action === "cancel";
  if (staffOnly && !STAFF.includes(user.role)) throw new HttpError(403, "Esta acción es solo para caja");

  switch (input.action) {
    case "serve":
      await serve(id);
      break;
    case "deliver":
      await deliver(id);
      break;
    case "add":
      await addItems(id, input.items);
      break;
    case "remove":
      await removeItem(id, input.itemId);
      break;
    case "cancel":
      await cancel(user, id);
      break;
    case "pay": {
      const o = await pay(user, id, input.method, input.received);
      return { ok: true, change: o.payment?.change ?? 0 };
    }
  }
  return { ok: true };
});
