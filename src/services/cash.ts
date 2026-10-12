import "server-only";
import { Types } from "mongoose";
import { HttpError, isDuplicate } from "@/lib/http";
import type { Session } from "@/lib/jwt";
import { CashSession } from "@/models/CashSession";
import { Order } from "@/models/Order";

async function totalsFor(sessionId: Types.ObjectId) {
  const rows = await Order.aggregate<{ _id: string; total: number; orders: number }>([
    { $match: { cashSession: sessionId, status: "pagado" } },
    { $group: { _id: "$payment.method", total: { $sum: "$total" }, orders: { $sum: 1 } } },
  ]);
  const t = { efectivo: 0, tarjeta: 0, transferencia: 0, orders: 0 };
  for (const r of rows) {
    t[r._id as keyof typeof t] = r.total;
    t.orders += r.orders;
  }
  return t;
}

export async function current() {
  const s = await CashSession.findOne({ status: "abierta" }).lean();
  if (!s) return null;
  const totals = await totalsFor(s._id);
  return { ...s, totals, expectedCash: s.openingAmount + totals.efectivo };
}

export function history(limit = 30) {
  return CashSession.find({ status: "cerrada" }).sort({ closedAt: -1 }).limit(limit).lean();
}

export async function open(user: Session, amount: number) {
  try {
    return await CashSession.create({ openingAmount: amount, openedBy: user.sub, openedByName: user.name });
  } catch (e) {
    if (isDuplicate(e)) throw new HttpError(409, "Ya hay una caja abierta");
    throw e;
  }
}

export async function close(user: Session, counted: number, note: string) {
  const s = await CashSession.findOne({ status: "abierta" });
  if (!s) throw new HttpError(409, "No hay caja abierta");
  const totals = await totalsFor(s._id);
  const expectedCash = s.openingAmount + totals.efectivo;
  s.set({
    status: "cerrada",
    closedAt: new Date(),
    closedBy: user.sub,
    closedByName: user.name,
    countedAmount: counted,
    expectedCash,
    difference: counted - expectedCash,
    note,
    totals,
  });
  return s.save();
}
