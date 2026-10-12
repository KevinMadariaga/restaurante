"use client";
import { AnimatePresence, motion } from "motion/react";
import { ChartColumn, ChevronDown, Printer, Coins, Receipt, ShoppingBag, TrendingUp, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { PrintableTicket, type ReceiptData } from "@/components/receipt";
import { CATEGORY_META, cn, Empty, ErrorNote, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { CATEGORY_LABEL, PAY_LABEL } from "@/lib/constants";
import { dateTime, isoDay, money, shortDate } from "@/lib/format";
import type { Report } from "@/lib/types";

type Preset = "hoy" | "ayer" | "mes" | "mes-pasado" | "rango";

function presetRange(p: Preset): [string, string] {
  const today = isoDay();
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  switch (p) {
    case "ayer": {
      const d = isoDay(new Date(Date.now() - 86_400_000));
      return [d, d];
    }
    case "mes":
      return [`${y}-${pad(m)}-01`, today];
    case "mes-pasado": {
      const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
      return [`${py}-${pad(pm)}-01`, `${py}-${pad(pm)}-${lastDay(py, pm)}`];
    }
    default:
      return [today, today];
  }
}

export default function VentasPage() {
  const [preset, setPreset] = useState<Preset>("hoy");
  const [custom, setCustom] = useState<[string, string]>(() => presetRange("mes"));
  const [from, to] = preset === "rango" ? custom : presetRange(preset);
  const { data, error } = useLive<Report>(`/api/reports?from=${from}&to=${to}`, 30000);

  return (
    <>
      <PageHeader title="Ventas" subtitle={from === to ? `Resumen del ${shortDate(`${from}T12:00:00-05:00`)}` : `Del ${shortDate(`${from}T12:00:00-05:00`)} al ${shortDate(`${to}T12:00:00-05:00`)}`} />

      <div className="mb-6 space-y-3">
        <Segmented
          id="ventas-preset"
          value={preset}
          onChange={setPreset}
          options={[
            { value: "hoy", label: "Hoy" },
            { value: "ayer", label: "Ayer" },
            { value: "mes", label: "Este mes" },
            { value: "mes-pasado", label: "Mes pasado" },
            { value: "rango", label: "Rango" },
          ]}
        />
        <AnimatePresence initial={false}>
          {preset === "rango" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-3 pt-1 sm:max-w-md">
                <input type="date" value={custom[0]} max={custom[1]} onChange={(e) => e.target.value && setCustom([e.target.value, custom[1]])} className="input" aria-label="Desde" />
                <input type="date" value={custom[1]} min={custom[0]} onChange={(e) => e.target.value && setCustom([custom[0], e.target.value])} className="input" aria-label="Hasta" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ErrorNote message={error} />
      {!data ? <Loading /> : data.totals.orders === 0 ? <Empty icon={ChartColumn} title="Sin ventas en este periodo" text="Cuando caja cobre pedidos aparecerán aquí." /> : <ReportView r={data} multiDay={from !== to} />}
    </>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
      <Skeleton className="col-span-full h-64" />
    </div>
  );
}

function ReportView({ r, multiDay }: { r: Report; multiDay: boolean }) {
  const kpis: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: "Ventas", value: money(r.totals.sales), icon: Coins, tone: "bg-teja text-white" },
    { label: "Pedidos", value: String(r.totals.orders), icon: Receipt, tone: "bg-white" },
    { label: "Ticket promedio", value: money(r.totals.avgTicket), icon: ShoppingBag, tone: "bg-white" },
    ...(r.totals.profit !== undefined ? [{ label: "Ganancia", value: money(r.totals.profit), icon: TrendingUp, tone: "bg-balcon text-white" }] : []),
  ];
  const maxDay = Math.max(...r.byDay.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={cn("rounded-2xl border border-linea/60 p-4 shadow-sm", k.tone)}
          >
            <k.icon className="size-5 opacity-70" />
            <p className="mt-3 text-sm opacity-75">{k.label}</p>
            <p className="font-display text-[clamp(1.4rem,4vw,2rem)] leading-tight tabular">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {multiDay && (
        <section className="card p-5">
          <h2 className="font-display text-xl">Ventas por día</h2>
          <div className="mt-5 flex h-48 items-end gap-1.5 overflow-x-auto pb-6">
            {r.byDay.map((d, i) => (
              <div key={d.date} className="group relative flex h-full min-w-6 flex-1 flex-col justify-end">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  style={{ height: `${(d.total / maxDay) * 100}%`, transformOrigin: "bottom" }}
                  className="rounded-t-md bg-teja/80 transition-colors [@media(hover:hover)]:group-hover:bg-teja"
                  title={`${d.date}: ${money(d.total)} · ${d.orders} pedidos`}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-tinta-2 tabular">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Bars
          title="Por forma de pago"
          rows={r.byMethod.map((m) => ({ key: m.method, label: PAY_LABEL[m.method] ?? m.method, total: m.total, sub: `${m.orders} pedidos` }))}
          total={r.totals.sales}
          color={() => "bg-puerta"}
        />
        <Bars
          title="Por categoría"
          rows={r.byCategory.map((c) => ({ key: c.category, label: CATEGORY_LABEL[c.category], total: c.total, sub: `${c.qty} und.` }))}
          total={r.totals.sales}
          color={(k) => ({ platillos: "bg-teja", bebidas: "bg-puerta", mecatos: "bg-maiz", helados: "bg-rosa" })[k] ?? "bg-tinta"}
        />
      </div>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 font-display text-xl">Lo que se vendió</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-tinta-2 uppercase">
              <tr className="border-b border-linea">
                <th className="px-5 py-2 font-semibold">Producto</th>
                <th className="px-3 py-2 text-right font-semibold">Cant.</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                {r.totals.profit !== undefined && <th className="px-5 py-2 text-right font-semibold">Ganancia</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {r.products.map((p) => {
                const Icon = CATEGORY_META[p.category].icon;
                return (
                  <tr key={p.name + p.category}>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2">
                        <Icon className={cn("size-4 shrink-0", CATEGORY_META[p.category].color)} />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{p.qty}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular">{money(p.total)}</td>
                    {p.profit !== undefined && <td className="px-5 py-2.5 text-right text-balcon tabular">{money(p.profit)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Detalle de pedidos pagados</h2>
        <div className="space-y-2">
          {r.orders.map((o) => (
            <OrderRow key={o._id} o={o} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Bars({
  title,
  rows,
  total,
  color,
}: {
  title: string;
  rows: { key: string; label: string; total: number; sub: string }[];
  total: number;
  color: (key: string) => string;
}) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-4 space-y-3.5">
        {rows.map((row, i) => {
          const pct = total ? (row.total / total) * 100 : 0;
          return (
            <li key={row.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">{row.label}</span>
                <span className="tabular">
                  {money(row.total)} <span className="text-tinta-2">· {Math.round(pct)}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cal-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  className={cn("h-full rounded-full", color(row.key))}
                />
              </div>
              <p className="mt-0.5 text-xs text-tinta-2">{row.sub}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OrderRow({ o }: { o: Report["orders"][number] }) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState<ReceiptData>();

  function reprint() {
    if (!o.payment || !o.paidAt) return;
    setPrinting({ order: o, ...o.payment, paidAt: o.paidAt });
    window.addEventListener("afterprint", () => setPrinting(undefined), { once: true });
    setTimeout(() => window.print(), 50); // deja montar el tiquete antes de imprimir
  }
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cal-2 font-display text-lg">{o.table}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            #{o.number} · Mesa {o.table}
          </span>
          <span className="block truncate text-xs text-tinta-2">
            {o.paidAt && dateTime(o.paidAt)} · {o.payment && PAY_LABEL[o.payment.method]} · {o.waiterName}
          </span>
        </span>
        <span className="font-semibold tabular">{money(o.total)}</span>
        <ChevronDown className={cn("size-5 text-tinta-2 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-dashed border-linea px-4 py-3 text-sm">
              {o.items.map((i) => (
                <div key={i._id} className="flex gap-2 py-0.5">
                  <span className="w-7 tabular">{i.qty}×</span>
                  <span className="flex-1">{i.name}</span>
                  <span className="tabular">{money(i.price * i.qty)}</span>
                </div>
              ))}
              {o.payment?.method === "efectivo" && (
                <p className="mt-2 text-xs text-tinta-2">
                  Recibido {money(o.payment.received)} · vueltos {money(o.payment.change)} · cobró {o.payment.cashierName}
                </p>
              )}
              <button onClick={reprint} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cal-2 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform">
                <Printer className="size-3.5" /> Reimprimir ticket
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {printing && <PrintableTicket r={printing} />}
    </div>
  );
}
