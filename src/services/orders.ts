import "server-only";
import { Types } from "mongoose";
import { HttpError, isDuplicate } from "@/lib/http";
import type { Session } from "@/lib/jwt";
import { tracksStock, type PayMethod } from "@/lib/constants";
import { nextSeq } from "@/models/Counter";
import { Order } from "@/models/Order";

type OrderDocument = Awaited<ReturnType<typeof getOpen>>;
import { Product } from "@/models/Product";
import { CashSession } from "@/models/CashSession";
import { todayPrices } from "./promotions";
import { assertTable } from "./tables";

type NewItem = { product: string; qty: number; note: string };
const STAFF = ["cajero", "admin"];

/** Descuenta stock de forma atómica; si un producto no alcanza, devuelve lo ya descontado. */
async function takeStock(items: NewItem[]) {
  const qty = new Map<string, number>();
  for (const i of items) qty.set(i.product, (qty.get(i.product) ?? 0) + i.qty);

  const products = await Product.find({ _id: { $in: [...qty.keys()] }, active: true }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const taken: [string, number][] = [];
  try {
    for (const [id, n] of qty) {
      const p = byId.get(id);
      if (!p) throw new HttpError(404, "Un producto ya no está disponible");
      if (!tracksStock(p.category)) continue;
      const r = await Product.updateOne({ _id: id, stock: { $gte: n } }, { $inc: { stock: -n } });
      if (!r.modifiedCount) throw new HttpError(409, `No hay suficiente "${p.name}" (quedan ${p.stock})`);
      taken.push([id, n]);
    }
  } catch (e) {
    await restock(taken);
    throw e;
  }
  return byId;
}

function restock(entries: [string, number][]) {
  return Promise.all(entries.map(([id, n]) => Product.updateOne({ _id: id, category: { $ne: "platillos" } }, { $inc: { stock: n } })));
}

async function snapshot(items: NewItem[], byId: Awaited<ReturnType<typeof takeStock>>, round: number, user: Session) {
  const promo = await todayPrices();
  return items.map((i) => {
    const p = byId.get(i.product)!;
    const price = promo.get(i.product) ?? p.salePrice;
    return { product: p._id, name: p.name, category: p.category, price, promo: promo.has(i.product), cost: p.costPrice, qty: i.qty, note: i.note, round, addedByName: user.name };
  });
}

/** Si quien modifica no es el mesero del pedido, queda registrado para avisarle. */
function logChange(order: OrderDocument, user: Session, text: string) {
  if (String(order.waiter) !== user.sub) order.changes.push({ by: user.sub, byName: user.name, text });
}

async function getOpen(id: string) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, "Pedido no encontrado");
  if (order.status !== "abierto") throw new HttpError(409, "El pedido ya está cerrado");
  return order;
}

export function listOpen() {
  return Order.find({ status: "abierto" }).sort({ createdAt: 1 }).select("-items.cost").lean();
}

/** Crea el pedido de la mesa, o suma una nueva ronda si la mesa ya tiene uno abierto. */
export async function createOrAppend(user: Session, table: number, items: NewItem[]) {
  await assertTable(table);
  const existing = await Order.findOne({ table, status: "abierto" }, "_id").lean();
  if (existing) return addItems(user, String(existing._id), items);

  const byId = await takeStock(items);
  try {
    return await Order.create({
      number: await nextSeq("order"),
      table,
      waiter: user.sub,
      waiterName: user.name,
      items: await snapshot(items, byId, 1, user),
    });
  } catch (e) {
    await restock(items.map((i) => [i.product, i.qty]));
    // Dos meseros abrieron la misma mesa a la vez: el segundo se suma como adición.
    if (isDuplicate(e)) return createOrAppend(user, table, items);
    throw e;
  }
}

export async function addItems(user: Session, orderId: string, items: NewItem[]) {
  const order = await getOpen(orderId);
  const byId = await takeStock(items);
  const round = Math.max(0, ...order.items.map((i) => i.round)) + 1;
  const added = await snapshot(items, byId, round, user);
  order.items.push(...added);
  logChange(order, user, `agregó ${added.map((i) => `${i.qty}× ${i.name}${i.note ? ` (“${i.note}”)` : ""}`).join(", ")}`);
  try {
    return await order.save();
  } catch (e) {
    await restock(items.map((i) => [i.product, i.qty]));
    throw e;
  }
}

/** Caja confirma que lo pendiente ya salió de cocina/barra y está listo para llevar. */
export async function serve(orderId: string) {
  const order = await getOpen(orderId);
  for (const i of order.items) if (i.status === "pendiente") i.status = "servido";
  return order.save();
}

/** El mesero entrega en la mesa lo que estaba servido. */
export async function deliver(orderId: string) {
  const order = await getOpen(orderId);
  if (!order.items.some((i) => i.status === "servido")) throw new HttpError(409, "No hay nada listo para entregar");
  for (const i of order.items) if (i.status === "servido") i.status = "entregado";
  return order.save();
}

export async function removeItem(user: Session, orderId: string, itemId: string) {
  const order = await getOpen(orderId);
  const item = order.items.find((i) => String(i._id) === itemId);
  if (!item) throw new HttpError(404, "El producto ya no está en el pedido");
  // Solo vuelve al inventario lo que no alcanzó a prepararse.
  if (item.status === "pendiente") await restock([[String(item.product), item.qty]]);
  order.items.pull(item._id);
  logChange(order, user, `quitó ${item.qty}× ${item.name}`);
  if (!order.items.length) {
    order.status = "cancelado";
    order.cancelledAt = new Date();
  }
  return order.save();
}

/** Mesero o caja: el cliente se fue sin consumir. Lo no preparado vuelve al inventario. */
/** Agrega o cambia el detalle de un producto que aún no se ha preparado. */
export async function setNote(user: Session, orderId: string, itemId: string, note: string) {
  const order = await getOpen(orderId);
  const item = order.items.find((i) => String(i._id) === itemId);
  if (!item) throw new HttpError(404, "El producto ya no está en el pedido");
  if (item.status !== "pendiente") throw new HttpError(409, "Ya se preparó; agrega uno nuevo con el detalle");
  if (item.note === note) return order;
  item.note = note;
  item.noteByName = user.name;
  logChange(order, user, note ? `puso detalle a ${item.name}: “${note}”` : `quitó el detalle de ${item.name}`);
  return order.save();
}

export async function cancel(orderId: string) {
  const order = await getOpen(orderId);
  await restock(order.items.filter((i) => i.status === "pendiente").map((i) => [String(i.product), i.qty]));
  order.status = "cancelado";
  order.cancelledAt = new Date();
  return order.save();
}

export async function pay(user: Session, orderId: string, method: PayMethod, received?: number) {
  const cash = await CashSession.findOne({ status: "abierta" }, "_id").lean();
  if (!cash) throw new HttpError(409, "Abre la caja antes de cobrar");

  const order = await getOpen(orderId);
  if (!order.items.length) throw new HttpError(409, "El pedido está vacío");
  if (order.stage !== "entregado") throw new HttpError(409, "Aún hay productos sin entregar en la mesa");

  const paidWith = method === "efectivo" ? (received ?? 0) : order.total;
  if (paidWith < order.total) throw new HttpError(400, "El valor recibido es menor al total");

  order.status = "pagado";
  order.paidAt = new Date();
  order.cashSession = cash._id;
  order.payment = {
    method,
    received: paidWith,
    change: paidWith - order.total,
    cashier: new Types.ObjectId(user.sub),
    cashierName: user.name,
  };
  return order.save(); // optimisticConcurrency evita cobrar dos veces el mismo pedido
}

export { STAFF };
