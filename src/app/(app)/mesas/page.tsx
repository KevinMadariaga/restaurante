"use client";
import { AnimatePresence, motion } from "motion/react";
import { Armchair, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useOrders } from "@/components/orders-context";
import { cn, PageHeader, Skeleton, STATUS_META } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { money } from "@/lib/format";

export default function MesasPage() {
  const { data, me } = useOrders();
  const tables = useLive<{ count: number }>("/api/tables", 15000);
  const count = tables.data?.count ?? 0;
  const byTable = new Map((data ?? []).map((o) => [o.table, o]));
  const mine = (data ?? []).filter((o) => o.waiter === me.sub);
  const ready = mine.filter((o) => o.stage === "servido").length;

  return (
    <>
      <PageHeader
        title="Mesas"
        subtitle={
          ready ? (
            <span className="font-semibold text-puerta">{ready === 1 ? "1 pedido listo para llevar" : `${ready} pedidos listos para llevar`}</span>
          ) : (
            `${byTable.size} de ${count} ocupadas`
          )
        }
        action={me.role === "admin" && tables.data && <TableCount count={count} onChange={tables.reload} />}
      />
      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-tinta-2">
        <Legend dot="bg-cal-3" label="Libre" />
        {(["pendiente", "servido", "entregado"] as const).map((s) => (
          <Legend key={s} dot={STATUS_META[s].dot} label={STATUS_META[s].label} />
        ))}
      </div>

      {!data || !tables.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <AnimatePresence initial={false}>
          {Array.from({ length: count }, (_, i) => i + 1).map((n, i) => {
            const o = byTable.get(n);
            const st = o && STATUS_META[o.stage];
            return (
              <motion.div
                key={n}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Link
                  href={`/mesas/${n}`}
                  className={cn(
                    "group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-[transform,box-shadow] duration-200 active:scale-[0.97]",
                    o ? "border-transparent bg-white shadow-[0_10px_30px_-14px_rgb(43_29_20/0.35)]" : "border-dashed border-linea bg-white/40",
                    o?.stage === "servido" && "text-puerta animate-ring",
                  )}
                >
                  {st && <span className={cn("absolute inset-x-0 top-0 h-1.5", st.dot)} />}
                  <div className="flex items-start justify-between">
                    <span className="font-display text-4xl leading-none text-tinta">{n}</span>
                    {o ? <span className={cn("size-2.5 rounded-full", st!.dot)} /> : <Armchair className="size-5 text-tinta-2/40" />}
                  </div>
                  {o ? (
                    <div className="text-tinta">
                      <p className={cn("text-xs font-semibold", st!.cls.split(" ").find((c) => c.startsWith("text-")))}>{st!.label}</p>
                      <p className="mt-0.5 flex items-baseline justify-between text-sm">
                        <span className="truncate text-tinta-2">{o.waiterName}</span>
                        <span className="font-semibold tabular">{money(o.total)}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-tinta-2">Libre · tomar pedido</p>
                  )}
                </Link>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

/** Solo admin: agrega una mesa al final o quita la última (si está libre). */
function TableCount({ count, onChange }: { count: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function set(next: number) {
    setBusy(true);
    try {
      await api("/api/tables", { method: "PATCH", body: { count: next } });
      toast.success(next > count ? `Mesa ${next} agregada` : `Mesa ${count} quitada`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-linea bg-white/80 p-1">
      <button
        aria-label="Quitar última mesa"
        disabled={busy || count <= 1}
        onClick={() => set(count - 1)}
        className="grid size-10 place-items-center rounded-xl text-tinta-2 transition active:scale-90 disabled:opacity-40"
      >
        <Minus className="size-5" />
      </button>
      <span className="min-w-20 text-center text-sm font-semibold">
        <span className="font-display text-xl tabular">{count}</span> mesas
      </span>
      <button
        aria-label="Agregar mesa"
        disabled={busy}
        onClick={() => set(count + 1)}
        className="grid size-10 place-items-center rounded-xl bg-teja text-white transition active:scale-90 disabled:opacity-40"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
