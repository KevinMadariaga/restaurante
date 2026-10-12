import "server-only";
import { DEFAULT_TABLES } from "@/lib/constants";
import { HttpError } from "@/lib/http";
import { Order } from "@/models/Order";
import { Setting } from "@/models/Setting";

export async function getTableCount() {
  const s = await Setting.findById("general").lean();
  return s?.tableCount ?? DEFAULT_TABLES;
}

export async function assertTable(table: number) {
  if (table > (await getTableCount())) throw new HttpError(400, `La mesa ${table} no existe`);
}

/** Cambia el número de mesas. No deja quitar mesas que tienen un pedido abierto. */
export async function setTableCount(count: number) {
  const busy = await Order.findOne({ status: "abierto", table: { $gt: count } }, "table").sort({ table: -1 }).lean();
  if (busy) throw new HttpError(409, `La mesa ${busy.table} tiene un pedido abierto; cóbralo o cancélalo antes de quitarla`);
  await Setting.updateOne({ _id: "general" }, { tableCount: count }, { upsert: true });
  return count;
}
