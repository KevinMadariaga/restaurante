"use client";
import { AnimatePresence, motion } from "motion/react";
import { BadgePercent, Check, Plus, Search, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PromoCard } from "@/components/promos";
import { Button, cn, Empty, ErrorNote, Field, MoneyInput, PageHeader, ProductThumb, Sheet, Skeleton } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { isoDay, money, shortDate } from "@/lib/format";
import type { Product, Promotion } from "@/lib/types";

export default function PromocionesPage() {
  const [day, setDay] = useState(isoDay);
  const { data, error, reload } = useLive<Promotion[]>(`/api/promotions?day=${day}`, 0);
  const [open, setOpen] = useState(false);
  const [seq, setSeq] = useState(0);
  const isToday = day === isoDay();

  async function remove(p: Promotion) {
    try {
      await api(`/api/promotions/${p._id}`, { method: "DELETE" });
      toast.success(`Promoción de ${p.product.name} eliminada`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Promociones"
        subtitle="Los meseros las ven al entrar y arriba de la carta. El precio especial se cobra solo ese día."
        action={
          <Button icon={Plus} onClick={() => (setOpen(true), setSeq((n) => n + 1))}>
            Nueva promoción
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="input w-auto" aria-label="Día" />
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setDay(isoDay())}>
            Volver a hoy
          </Button>
        )}
        <span className="text-sm text-tinta-2">{isToday ? "Hoy" : shortDate(`${day}T12:00:00-05:00`)}</span>
      </div>
      <ErrorNote message={error} />

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : data.length === 0 ? (
        <Empty icon={BadgePercent} title="Sin promociones este día" text="Crea una con el botón “Nueva promoción”." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {data.map((p, i) => (
              <motion.div key={p._id} layout exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                <PromoCard
                  promo={p}
                  index={i}
                  footer={
                    <>
                      {!p.product.active && <p className="mb-2 text-sm text-teja-2">Producto inactivo: los meseros no la verán.</p>}
                      <DeleteButton onConfirm={() => remove(p)} />
                    </>
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PromoForm key={seq} open={open} defaultDay={day} onClose={() => setOpen(false)} onSaved={reload} />
    </>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setArmed(false)}>
        No
      </Button>
      <Button size="sm" className="flex-1" icon={Trash} onClick={onConfirm}>
        Sí, quitar
      </Button>
    </div>
  ) : (
    <Button size="sm" variant="danger" className="w-full" icon={Trash} onClick={() => setArmed(true)}>
      Quitar promoción
    </Button>
  );
}

function PromoForm({ open, defaultDay, onClose, onSaved }: { open: boolean; defaultDay: string; onClose: () => void; onSaved: () => void }) {
  const { data: products } = useLive<Product[]>(open ? "/api/products" : null, 0);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Product>();
  const [price, setPrice] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const list = (products ?? []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const promo = Number(price) || 0;
  const off = picked && promo ? Math.round((1 - promo / picked.salePrice) * 100) : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return setError("Elige un producto");
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/promotions", { body: { product: picked._id, price: promo, title, day } });
      toast.success(`Promoción de ${picked.name} creada`);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva promoción"
      footer={
        <Button form="promo-form" type="submit" size="lg" className="w-full" loading={busy} disabled={!picked || !promo}>
          Publicar promoción
        </Button>
      }
    >
      <form id="promo-form" onSubmit={save} className="space-y-4">
        <ErrorNote message={error} />

        <div>
          <span className="label">Producto</span>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tinta-2/60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="input pl-11" />
          </div>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-linea bg-white p-1">
            {!products && <Skeleton className="h-14" />}
            {list.map((p) => {
              const on = picked?._id === p._id;
              return (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => setPicked(p)}
                    className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors", on ? "bg-tinta text-cal" : "active:bg-cal-2")}
                  >
                    <ProductThumb product={p} className="size-10 shrink-0 rounded-lg" />
                    <span className="flex-1 truncate font-semibold">{p.name}</span>
                    <span className="text-sm tabular">{money(p.salePrice)}</span>
                    {on && <Check className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio promoción">
            <MoneyInput
              required
              value={price}
              onChange={setPrice}
              className="font-display text-xl"
              placeholder={picked ? money(picked.salePrice).replace(/[^\d.]/g, "") : "0"}
            />
          </Field>
          <Field label="Día">
            <input type="date" required value={day} onChange={(e) => setDay(e.target.value)} className="input" />
          </Field>
        </div>
        {picked && promo > 0 && (
          <p className={cn("-mt-2 text-sm", off > 0 ? "text-balcon" : "text-teja-2")}>
            {off > 0 ? `${off}% de descuento · antes ${money(picked.salePrice)}` : "Debe ser menor al precio normal"}
          </p>
        )}

        <Field label="Frase corta (opcional)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input" placeholder="¡Solo hoy! · Almuerzo ejecutivo" />
        </Field>
      </form>
    </Sheet>
  );
}
