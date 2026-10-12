"use client";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, Check, Clock, HandPlatter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/hooks/use-live";
import { hour } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import { useOrders } from "./orders-context";
import { Button } from "./ui";

const STORE = "pp_acked_alerts";

let audio: AudioContext | undefined;
/** Dos tonos cortos. El navegador exige un toque previo del usuario para sonar. */
function chime(high: boolean) {
  try {
    audio ??= new AudioContext();
    const notes = high ? [880, 1175] : [660, 880];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      const t = audio!.currentTime + i * 0.18;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audio!.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch {}
}

type Alert = { order: Order; items: OrderItem[]; key: string };

/**
 * Aviso a pantalla completa:
 *  - Caja: "Pedido para la mesa X" cuando llegan productos pendientes.
 *  - Mesero: "Pedido listo" cuando caja marca servido un pedido suyo.
 */
export function OrderAlerts() {
  const { data, me, reload } = useOrders();
  const mode = me.role === "cajero" ? "caja" : me.role === "mesero" ? "mesero" : null;
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setAcked(new Set(JSON.parse(sessionStorage.getItem(STORE) ?? "[]")));
    } catch {}
    const unlock = () => audio?.resume();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const queue = useMemo<Alert[]>(() => {
    if (!mode || !data) return [];
    const want = mode === "caja" ? "pendiente" : "servido";
    return data.flatMap((order) => {
      if (mode === "mesero" && order.waiter !== me.sub) return [];
      const items = order.items.filter((i) => i.status === want);
      if (!items.length) return [];
      const key = `${mode}:${order._id}:${items.map((i) => i._id).join(",")}`;
      return acked.has(key) ? [] : [{ order, items, key }];
    });
  }, [data, mode, me.sub, acked]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    chime(mode === "caja");
    navigator.vibrate?.([180, 80, 180]);
  }, [current?.key, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function ack(key: string) {
    setAcked((prev) => {
      const next = new Set(prev).add(key);
      try {
        sessionStorage.setItem(STORE, JSON.stringify([...next].slice(-200)));
      } catch {}
      return next;
    });
  }

  async function act() {
    if (!current) return;
    setBusy(true);
    try {
      await api(`/api/orders/${current.order._id}`, { method: "PATCH", body: { action: mode === "caja" ? "serve" : "deliver" } });
      toast.success(mode === "caja" ? `Mesa ${current.order.table}: marcado como servido` : `Mesa ${current.order.table}: pedido entregado`);
      ack(current.key);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isAddition = current && Math.min(...current.items.map((i) => i.round)) > 1;
  const caja = mode === "caja";

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto text-white ${caja ? "bg-teja" : "bg-balcon"}`}
          role="alertdialog"
          aria-live="assertive"
        >
          <div className="tejado h-3 shrink-0 opacity-60 brightness-75" />
          <div className="zocalo h-1.5 shrink-0" />
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.55 }}
            className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <div className="flex items-center justify-between text-white/80">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
                {caja ? <BellRing className="size-4 animate-[ring_1.6s_infinite]" /> : <HandPlatter className="size-4" />}
                {caja ? (isAddition ? "Adición" : "Nuevo pedido") : "¡Pedido listo!"}
              </span>
              {queue.length > 1 && <span className="text-sm font-semibold">1 de {queue.length}</span>}
            </div>

            <h2 className="mt-6 font-display text-[clamp(2.6rem,11vw,5.5rem)] leading-[0.95]">
              {caja ? (isAddition ? "Adición para la" : "Pedido para la") : "Lleva el pedido a la"}
              <br />
              <span className="inline-block rounded-2xl bg-white px-4 text-tinta">mesa {current.order.table}</span>
            </h2>
            <p className="mt-4 text-white/80">
              Pedido #{current.order.number} · {current.order.waiterName} · {hour(current.items[0].addedAt)}
            </p>

            <ul className="mt-6 flex-1 space-y-2">
              {current.items.map((i, idx) => (
                <motion.li
                  key={i._id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-start gap-4 rounded-2xl bg-black/15 px-4 py-3"
                >
                  <span className="font-display text-3xl leading-none tabular">{i.qty}×</span>
                  <span className="flex-1">
                    <span className="block text-xl font-semibold">{i.name}</span>
                    {i.note && <span className="mt-0.5 block rounded-lg bg-white/15 px-2 py-0.5 text-sm">📝 {i.note}</span>}
                  </span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                size="lg"
                variant="outline"
                className="h-16 border-2 border-white bg-white! text-base text-tinta shadow-[0_10px_24px_-10px_rgb(0_0_0/0.45)] sm:text-lg"
                icon={Check}
                loading={busy}
                onClick={act}
              >
                {caja ? "Marcar servido" : "Entregado"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 border-2 border-white/70 bg-white/15! text-base text-white backdrop-blur-sm sm:text-lg [@media(hover:hover)]:hover:bg-white/25!"
                icon={Clock}
                onClick={() => ack(current.key)}
              >
                {caja ? "Ver luego" : "Voy en camino"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
