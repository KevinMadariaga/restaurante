import "server-only";
import { TZ, TZ_OFFSET } from "@/lib/constants";
import { Order } from "@/models/Order";

/** Resumen de ventas pagadas entre dos fechas (YYYY-MM-DD, ambas incluidas, hora Colombia). */
export async function salesReport(from: string, to: string, withCost: boolean) {
  const start = new Date(`${from}T00:00:00${TZ_OFFSET}`);
  const end = new Date(new Date(`${to}T00:00:00${TZ_OFFSET}`).getTime() + 86_400_000);
  const match = { status: "pagado", paidAt: { $gte: start, $lt: end } };

  const [r] = await Order.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [{ $group: { _id: null, sales: { $sum: "$total" }, orders: { $sum: 1 } } }],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TZ } },
              total: { $sum: "$total" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byMethod: [{ $group: { _id: "$payment.method", total: { $sum: "$total" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }],
        products: [
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              name: { $last: "$items.name" },
              category: { $last: "$items.category" },
              qty: { $sum: "$items.qty" },
              total: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
              cost: { $sum: { $multiply: ["$items.cost", "$items.qty"] } },
            },
          },
          { $sort: { total: -1 } },
        ],
        orders: [{ $sort: { paidAt: -1 } }, { $limit: 300 }, { $project: { "items.cost": 0 } }],
      },
    },
  ]);

  const t = r.totals[0] ?? { sales: 0, orders: 0 };
  const cost = r.products.reduce((s: number, p: { cost: number }) => s + p.cost, 0);
  const byCategory = new Map<string, { category: string; total: number; qty: number }>();
  for (const p of r.products) {
    const c = byCategory.get(p.category) ?? { category: p.category, total: 0, qty: 0 };
    c.total += p.total;
    c.qty += p.qty;
    byCategory.set(p.category, c);
  }

  return {
    totals: {
      sales: t.sales,
      orders: t.orders,
      avgTicket: t.orders ? Math.round(t.sales / t.orders) : 0,
      ...(withCost && { cost, profit: t.sales - cost }),
    },
    byDay: r.byDay.map((d: { _id: string; total: number; orders: number }) => ({ date: d._id, total: d.total, orders: d.orders })),
    byMethod: r.byMethod.map((m: { _id: string; total: number; orders: number }) => ({ method: m._id, total: m.total, orders: m.orders })),
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    products: r.products.map((p: { name: string; category: string; qty: number; total: number; cost: number }) => ({
      name: p.name,
      category: p.category,
      qty: p.qty,
      total: p.total,
      ...(withCost && { profit: p.total - p.cost }),
    })),
    orders: r.orders,
  };
}
