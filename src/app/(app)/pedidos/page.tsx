"use client";
import { AnimatePresence, motion } from "motion/react";
import { Banknote, Check, ChefHat, CreditCard, HandPlatter, Receipt, Smartphone, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useOrders } from "@/components/orders-context";
import { ReceiptSheet, type ReceiptData } from "@/components/receipt";
import { Button, cn, Empty, MoneyInput, PageHeader, Segmented, Sheet, Skeleton, STATUS_META } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { PAY_LABEL, type ItemStatus, type PayMethod } from "@/lib/constants";
import { ago, money } from "@/lib/format";
import type { CashSession, Order } from "@/lib/types";

const COLUMNS: { stage: ItemStatus; title: string; hint: string; icon: typeof ChefHat }[] = [
  { stage: "pendiente", title: "Nuevos", hint: "Prepara y marca servido", icon: ChefHat },
  { stage: "servido", title: "Listos", hint: "Esperando al mesero", icon: HandPlatter },
  { stage: "entregado", title: "Por cobrar", hint: "Ya están en la mesa", icon: Receipt },
];

export default function PedidosPage() {
  const { data, reload } = useOrders();
  const { data: cash } = useLive<{ current: CashSession | null }>("/api/cash", 10000);
  const [tab, setTab] = useState<ItemStatus>("pendiente");
  const [paying, setPaying] = useState<string>();
  const payOrder = data?.find((o) => o._id === paying);
  const [receipt, setReceipt] = useState<ReceiptData>();

  return (
    <>
      <PageHeader title="Pedidos" subtitle={data ? `${data.length} mesas con pedido abierto` : "Cargando…"} />

      {cash && !cash.current && (
        <Link href="/caja" className="mb-5 flex items-center gap-3 rounded-2xl bg-maiz/20 px-4 py-3 text-[#7a520e] animate-rise">
          <Wallet className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">La caja está cerrada. Ábrela con la base para poder cobrar.</span>
          <span className="text-sm font-bold underline">Abrir caja</span>
        </Link>
      )}

      <div className="mb-4 lg:hidden">
        <Segmented
          id="pedidos-tab"
          value={tab}
          onChange={setTab}
          options={COLUMNS.map((c) => ({ value: c.stage, label: `${c.title} ${count(data, c.stage)}` }))}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = (data ?? []).filter((o) => o.stage === col.stage);
          return (
            <section key={col.stage} className={cn(tab !== col.stage && "hidden lg:block")}>
              <header className="mb-3 hidden items-center gap-2 lg:flex">
                <span className={cn("grid size-8 place-items-center rounded-lg", STATUS_META[col.stage].cls)}>
                  <col.icon className="size-4" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-xl leading-none">{col.title}</h2>
                  <p className="text-xs text-tinta-2">{col.hint}</p>
                </div>
                <span className="rounded-full bg-cal-2 px-2.5 py-0.5 text-sm font-semibold tabular">{list.length}</span>
              </header>

              {!data ? (
                <Skeleton className="h-48" />
              ) : list.length === 0 ? (
                <Empty icon={col.icon} title="Sin pedidos" text={col.hint} />
              ) : (
                <motion.div layout className="space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {list.map((o) => (
                      <OrderCard key={o._id} order={o} onPay={() => setPaying(o._id)} onChange={reload} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </section>
          );
        })}
      </div>

      <PaySheet order={payOrder} cashOpen={!!cash?.current} onClose={() => setPaying(undefined)} onDone={reload} onPaid={setReceipt} />
      <ReceiptSheet data={receipt} onClose={() => setReceipt(undefined)} />
    </>
  );
}

function count(data: Order[] | undefined, stage: ItemStatus) {
  const n = data?.filter((o) => o.stage === stage).length ?? 0;
  return n ? `· ${n}` : "";
}

function OrderCard({ order, onPay, onChange }: { order: Order; onPay: () => void; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const pending = order.items.filter((i) => i.status === "pendiente");

  async function serve() {
    setBusy(true);
    try {
      await api(`/api/orders/${order._id}`, { method: "PATCH", body: { action: "serve" } });
      toast.success(`Mesa ${order.table}: listo para llevar`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
      className="card overflow-hidden"
    >
      <div className={cn("h-1.5", STATUS_META[order.stage].dot)} />
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div>
          <p className="font-display text-3xl leading-none">Mesa {order.table}</p>
          <p className="mt-1 text-xs text-tinta-2">
            #{order.number} · {order.waiterName} · {ago(order.updatedAt)}
          </p>
        </div>
        <p className="font-display text-xl tabular">{money(order.total)}</p>
      </div>
      <ul className="mt-3 space-y-1 px-4 text-sm">
        {order.items.map((i) => (
          <li key={i._id} className={cn("flex gap-2", i.status !== "pendiente" && order.stage === "pendiente" && "text-tinta-2/60")}>
            <span className="w-6 font-semibold tabular">{i.qty}×</span>
            <span className="flex-1">
              {i.name}
              {i.note && <span className="block text-xs text-tinta-2 italic">“{i.note}”</span>}
            </span>
            {i.status === "pendiente" && order.stage === "pendiente" && i.round > 1 && (
              <span className="h-fit rounded-full bg-maiz/25 px-2 text-[11px] font-semibold text-[#7a520e]">Adición</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-linea bg-cal-2/40 p-3">
        {order.stage === "pendiente" && (
          <Button className="w-full" variant="dark" icon={Check} loading={busy} onClick={serve}>
            Marcar servido ({pending.reduce((s, i) => s + i.qty, 0)})
          </Button>
        )}
        {order.stage === "servido" && <p className="py-2 text-center text-sm font-semibold text-puerta">Avisado al mesero · esperando entrega</p>}
        {order.stage === "entregado" && (
          <Button className="w-full" icon={Receipt} onClick={onPay}>
            Cobrar {money(order.total)}
          </Button>
        )}
      </div>
    </motion.article>
  );
}

const METHOD_ICON: Record<PayMethod, typeof Banknote> = { efectivo: Banknote, tarjeta: CreditCard, transferencia: Smartphone };

function PaySheet({
  order,
  cashOpen,
  onClose,
  onDone,
  onPaid,
}: {
  order?: Order;
  cashOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  onPaid: (r: ReceiptData) => void;
}) {
  const { me } = useOrders();
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Conserva el último pedido para que la hoja anime su salida con contenido.
  const [last, setLast] = useState<Order>();
  if (order && order !== last) setLast(order);
  const o = order ?? last;

  const total = o?.total ?? 0;
  const got = Number(received) || 0;
  const change = got - total;
  const canPay = cashOpen && (method !== "efectivo" || got >= total);
  const quick = [...new Set([total, Math.ceil(total / 10000) * 10000, 20000, 50000, 100000])].filter((v) => v >= total).slice(0, 4);

  function close() {
    setReceived("");
    setMethod("efectivo");
    setConfirmCancel(false);
    onClose();
  }

  async function run(body: { action: string } & Record<string, unknown>, msg: string) {
    if (!o) return;
    setBusy(true);
    try {
      const r = await api<{ change?: number }>(`/api/orders/${o._id}`, { method: "PATCH", body });
      toast.success(msg, { duration: 6000 });
      if (body.action === "pay")
        onPaid({
          order: o,
          method,
          received: method === "efectivo" ? got : total,
          change: r.change ?? 0,
          paidAt: new Date().toISOString(),
          cashierName: me.name,
        });
      onDone();
      close();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!order}
      onClose={close}
      title={o ? `Cuenta · mesa ${o.table}` : ""}
      footer={
        <Button
          size="lg"
          variant="success"
          className="w-full"
          icon={Check}
          disabled={!canPay}
          loading={busy}
          onClick={() =>
            run(
              { action: "pay", method, received: method === "efectivo" ? got : undefined },
              method === "efectivo" && change > 0 ? `Pagado · entrega ${money(change)} de vueltos` : `Mesa ${o?.table} pagada`,
            )
          }
        >
          {cashOpen ? `Confirmar pago · ${money(total)}` : "Abre la caja para cobrar"}
        </Button>
      }
    >
      {o && (
        <div className="space-y-5">
          {/* Comanda tipo tiquete */}
          <div className="rounded-2xl border border-dashed border-tinta/25 bg-white px-4 py-4 font-mono text-sm">
            <p className="text-center font-sans font-semibold tracking-widest uppercase">Pueblito Paisa</p>
            <p className="mb-3 text-center text-xs text-tinta-2">
              Pedido #{o.number} · Mesa {o.table} · {o.waiterName}
            </p>
            <div className="border-t border-dashed border-tinta/25 pt-2">
              {o.items.map((i) => (
                <div key={i._id} className="flex gap-2 py-0.5">
                  <span className="w-7 tabular">{i.qty}</span>
                  <span className="flex-1 truncate">{i.name}</span>
                  <span className="tabular">{money(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-dashed border-tinta/25 pt-2 font-sans text-lg font-bold">
              <span>TOTAL</span>
              <span className="tabular">{money(total)}</span>
            </div>
          </div>

          <div>
            <p className="label mb-2">Forma de pago</p>
            <Segmented
              id="pay-method"
              value={method}
              onChange={setMethod}
              options={(Object.keys(PAY_LABEL) as PayMethod[]).map((m) => ({ value: m, label: PAY_LABEL[m], icon: METHOD_ICON[m] }))}
            />
          </div>

          <AnimatePresence initial={false}>
            {method === "efectivo" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <label className="label mb-2 block" htmlFor="received">
                  ¿Con cuánto paga?
                </label>
                <MoneyInput id="received" value={received} onChange={setReceived} className="h-14 font-display text-2xl" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {quick.map((v) => (
                    <button
                      key={v}
                      onClick={() => setReceived(String(v))}
                      className="rounded-full border border-linea bg-white px-3 py-1.5 text-sm font-semibold active:scale-95 transition-transform"
                    >
                      {v === total ? "Exacto" : money(v)}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    "mt-4 rounded-2xl px-4 py-4 transition-colors",
                    !got ? "bg-cal-2" : change >= 0 ? "bg-balcon text-white" : "bg-teja/10 text-teja-2",
                  )}
                >
                  <p className="text-sm font-semibold opacity-80">{!got || change >= 0 ? "Vueltos a entregar" : "Falta"}</p>
                  <motion.p key={change} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl tabular">
                    {money(Math.abs(got ? change : 0))}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t border-linea pt-4">
            {confirmCancel ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-teja-2">¿Cancelar todo el pedido? Lo no preparado vuelve al inventario.</p>
                <Button size="sm" variant="dark" onClick={() => setConfirmCancel(false)}>
                  No
                </Button>
                <Button size="sm" variant="primary" loading={busy} onClick={() => run({ action: "cancel" }, `Pedido de mesa ${o.table} cancelado`)}>
                  Sí, cancelar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="danger" icon={X} onClick={() => setConfirmCancel(true)}>
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

