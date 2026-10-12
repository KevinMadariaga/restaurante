"use client";
import { motion } from "motion/react";
import { Banknote, CreditCard, Lock, LockOpen, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, cn, Empty, ErrorNote, Field, MoneyInput as BaseMoneyInput, PageHeader, Skeleton } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { dateTime, hour, money } from "@/lib/format";
import type { CashSession } from "@/lib/types";

type CashData = { current: (CashSession & { expectedCash: number }) | null; history: CashSession[] };

export default function CajaPage() {
  const { data, error, reload } = useLive<CashData>("/api/cash", 8000);

  return (
    <>
      <PageHeader title="Caja" subtitle="Apertura con base, ventas del turno y cierre con arqueo." />
      <ErrorNote message={error} />
      {!data ? (
        <Skeleton className="h-72" />
      ) : data.current ? (
        <OpenSession s={data.current} onDone={reload} />
      ) : (
        <OpenForm onDone={reload} />
      )}

      <h2 className="mt-10 mb-3 font-display text-2xl">Cierres anteriores</h2>
      {data && data.history.length === 0 && <Empty icon={Wallet} title="Aún no hay cierres" />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.history.map((h, i) => (
          <motion.div
            key={h._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{dateTime(h.openedAt)}</p>
                <p className="text-xs text-tinta-2">
                  {h.openedByName} → {h.closedByName} · cerró {h.closedAt && hour(h.closedAt)}
                </p>
              </div>
              <Diff value={h.difference ?? 0} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <Row k="Base" v={h.openingAmount} />
              <Row k="Pedidos" v={h.totals.orders} raw />
              <Row k="Efectivo" v={h.totals.efectivo} />
              <Row k="Tarjeta" v={h.totals.tarjeta} />
              <Row k="Transferencia" v={h.totals.transferencia} />
              <Row k="Contado" v={h.countedAmount ?? 0} />
            </dl>
            {h.note && <p className="mt-2 text-sm text-tinta-2 italic">“{h.note}”</p>}
          </motion.div>
        ))}
      </div>
    </>
  );
}

function Row({ k, v, raw }: { k: string; v: number; raw?: boolean }) {
  return (
    <>
      <dt className="text-tinta-2">{k}</dt>
      <dd className="text-right font-semibold tabular">{raw ? v : money(v)}</dd>
    </>
  );
}

function Diff({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold tabular",
        value === 0 ? "bg-balcon/12 text-balcon" : value > 0 ? "bg-puerta/12 text-puerta" : "bg-teja/12 text-teja-2",
      )}
    >
      {value === 0 ? "Cuadrada" : `${value > 0 ? "Sobra" : "Falta"} ${money(Math.abs(value))}`}
    </span>
  );
}

function MoneyInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <BaseMoneyInput autoFocus={autoFocus} value={value} onChange={onChange} className="h-14 font-display text-2xl" />
  );
}

function OpenForm({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function open(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/cash", { body: { action: "open", amount: Number(amount) || 0 } });
      toast.success("Caja abierta. ¡Buen turno!");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={open} className="card mx-auto max-w-md overflow-hidden animate-rise">
      <div className="zocalo h-2" />
      <div className="p-6">
        <span className="grid size-14 place-items-center rounded-2xl bg-maiz/20 text-[#8a5d10]">
          <Lock className="size-7" />
        </span>
        <h2 className="mt-4 font-display text-3xl">La caja está cerrada</h2>
        <p className="mt-1 text-tinta-2">Cuenta el efectivo con el que empiezas (la base) y ábrela para poder cobrar.</p>
        <Field label="Base en efectivo" className="mt-5">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <p className="mt-1 text-sm text-tinta-2 tabular">{money(Number(amount) || 0)}</p>
        <Button type="submit" size="lg" className="mt-5 w-full" icon={LockOpen} loading={busy}>
          Abrir caja
        </Button>
      </div>
    </form>
  );
}

function OpenSession({ s, onDone }: { s: CashData["current"] & {}; onDone: () => void }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const diff = (Number(counted) || 0) - s.expectedCash;
  const sales = s.totals.efectivo + s.totals.tarjeta + s.totals.transferencia;

  async function close(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/cash", { body: { action: "close", counted: Number(counted) || 0, note } });
      toast.success("Caja cerrada correctamente");
      setCounted("");
      setNote("");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const tiles = [
    { label: "Efectivo", v: s.totals.efectivo, icon: Banknote, cls: "bg-balcon/12 text-balcon" },
    { label: "Tarjeta", v: s.totals.tarjeta, icon: CreditCard, cls: "bg-puerta/12 text-puerta" },
    { label: "Transferencia", v: s.totals.transferencia, icon: Smartphone, cls: "bg-rosa/15 text-rosa" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="card overflow-hidden animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-balcon px-5 py-4 text-white">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <span className="size-2 animate-pulse rounded-full bg-maiz" /> Caja abierta
            </p>
            <p className="text-sm text-white/80">
              {s.openedByName} · desde {hour(s.openedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80">Ventas del turno</p>
            <p className="font-display text-3xl tabular">{money(sales)}</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-cal-2/60 p-4">
              <span className={cn("grid size-9 place-items-center rounded-xl", t.cls)}>
                <t.icon className="size-5" />
              </span>
              <p className="mt-3 text-sm text-tinta-2">{t.label}</p>
              <p className="font-display text-2xl tabular">{money(t.v)}</p>
            </div>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-y-2 border-t border-linea px-5 py-4 text-sm">
          <dt className="text-tinta-2">Base inicial</dt>
          <dd className="text-right font-semibold tabular">{money(s.openingAmount)}</dd>
          <dt className="text-tinta-2">Pedidos cobrados</dt>
          <dd className="text-right font-semibold tabular">{s.totals.orders}</dd>
          <dt className="font-semibold">Efectivo esperado en caja</dt>
          <dd className="text-right font-display text-xl tabular">{money(s.expectedCash)}</dd>
        </dl>
      </section>

      <form onSubmit={close} className="card p-5 animate-rise [animation-delay:80ms]">
        <h2 className="font-display text-2xl">Cerrar caja</h2>
        <p className="mt-1 text-sm text-tinta-2">Cuenta los billetes y monedas del cajón (incluida la base).</p>
        <Field label="Efectivo contado" className="mt-4">
          <MoneyInput value={counted} onChange={setCounted} />
        </Field>
        {counted && (
          <div className="mt-3">
            <Diff value={diff} />
          </div>
        )}
        <Field label="Observación (opcional)" className="mt-4">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="input" placeholder="Ej. faltante por vuelto mal dado" />
        </Field>
        <Button type="submit" size="lg" variant="dark" className="mt-5 w-full" icon={Lock} loading={busy} disabled={!counted}>
          Cerrar caja
        </Button>
      </form>
    </div>
  );
}
