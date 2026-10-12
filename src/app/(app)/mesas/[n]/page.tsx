"use client";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Minus, PencilLine, Plus, Search, Send, ShoppingBag, Trash, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useOrders } from "@/components/orders-context";
import { PromoBadge, PromoCard, PromoCarousel, usePromos } from "@/components/promos";
import { Button, CATEGORY_META, cn, Empty, ProductThumb, Segmented, Sheet, Skeleton, StatusChip } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { available, CATEGORIES, CATEGORY_LABEL, tracksStock, type Category } from "@/lib/constants";
import { hour, money } from "@/lib/format";
import type { OrderItem, Product } from "@/lib/types";

type Cart = Record<string, { qty: number; note: string }>;

export default function MesaPage() {
  const table = Number(useParams<{ n: string }>().n);
  const { data: orders, reload } = useOrders();
  const { data: products, reload: reloadProducts } = useLive<Product[]>("/api/products", 15000);
  const order = orders?.find((o) => o.table === table);
  const { promos, priceOf } = usePromos();
  const price = (p: Product) => priceOf.get(p._id) ?? p.salePrice;

  const [cat, setCat] = useState<Category | "todo">("todo");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p._id, p])), [products]);
  const lines = Object.entries(cart).flatMap(([id, l]) => (byId.has(id) ? [{ p: byId.get(id)!, ...l }] : []));
  const cartQty = lines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = lines.reduce((s, l) => s + l.qty * price(l.p), 0);

  const visible = (products ?? []).filter(
    (p) => (cat === "todo" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function setQty(p: Product, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[p._id];
      else next[p._id] = { note: c[p._id]?.note ?? "", qty: Math.min(qty, available(p)) };
      return next;
    });
  }

  async function send() {
    setSending(true);
    const items = lines.map((l) => ({ product: l.p._id, qty: l.qty, note: l.note }));
    try {
      if (order) await api(`/api/orders/${order._id}`, { method: "PATCH", body: { action: "add", items } });
      else await api("/api/orders", { body: { table, items } });
      toast.success(order ? `Adición enviada a caja · mesa ${table}` : `Pedido enviado a caja · mesa ${table}`);
      setCart({});
      setCartOpen(false);
      reload();
      reloadProducts();
    } catch (e) {
      toast.error((e as Error).message);
      reloadProducts();
    } finally {
      setSending(false);
    }
  }

  // Si el carrito se vacía, cerrar la hoja.
  useEffect(() => {
    if (!cartQty) setCartOpen(false);
  }, [cartQty]);

  return (
    <>
      <div className="mb-5 flex items-center gap-3 animate-rise">
        <Link href="/mesas" aria-label="Volver a mesas" className="grid size-11 place-items-center rounded-full border border-linea bg-white/70 active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl leading-none sm:text-4xl">Mesa {table}</h1>
          <p className="mt-1 truncate text-sm text-tinta-2">
            {order ? `Pedido #${order.number} · ${order.waiterName} · desde ${hour(order.createdAt)}` : "Sin pedido abierto"}
          </p>
        </div>
        {order && <StatusChip status={order.stage} className="hidden sm:inline-flex" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Pedido actual */}
        <aside className="lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <CurrentOrder table={table} onChange={() => (reload(), reloadProducts())} />
        </aside>

        {/* Carta */}
        <section className="min-w-0 lg:order-1">
          {promos.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 font-display text-2xl">
                <PromoBadge /> Promociones de hoy
              </h2>
              <PromoCarousel
                promos={promos}
                render={(pr, i) => {
                  const p = byId.get(pr.product._id);
                  const qty = cart[pr.product._id]?.qty ?? 0;
                  return (
                      <PromoCard
                        promo={pr}
                        index={i}
                        footer={
                          p &&
                          (qty > 0 ? (
                            <Stepper qty={qty} max={available(p)} onQty={(n) => setQty(p, n)} wide />
                          ) : (
                            <Button className="w-full" icon={Plus} disabled={available(p) <= 0} onClick={() => setQty(p, 1)}>
                              Agregar promo
                            </Button>
                          ))
                        }
                      />
                  );
                }}
              />
            </div>
          )}
          <h2 className="mb-3 font-display text-2xl">{order ? "Agregar a la cuenta" : "Tomar pedido"}</h2>
          <div className="sticky top-[calc(env(safe-area-inset-top,0px)+4.4rem)] z-10 -mx-4 space-y-2 bg-cal/90 px-4 py-2 backdrop-blur-md sm:mx-0 sm:px-0">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tinta-2/60" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="input h-11 pl-11" enterKeyHint="search" />
            </div>
            <Segmented
              id="mesa-cat"
              value={cat}
              onChange={setCat}
              options={[{ value: "todo", label: "Todo" }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c], icon: CATEGORY_META[c].icon }))]}
            />
          </div>

          {!products ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-52" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-3">
              <Empty icon={Search} title="Nada por aquí" text="Prueba con otra categoría o búsqueda." />
            </div>
          ) : (
            <motion.div layout className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {visible.map((p) => (
                  <ProductCard key={p._id} p={p} promo={priceOf.get(p._id)} qty={cart[p._id]?.qty ?? 0} onQty={(n) => setQty(p, n)} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>

      {/* Barra del carrito */}
      <AnimatePresence>
        {cartQty > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
            className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom,0px))] z-20 px-4 md:bottom-6"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="mx-auto flex h-16 w-full max-w-xl items-center gap-3 rounded-2xl bg-tinta pr-3 pl-4 text-cal shadow-2xl active:scale-[0.98] transition-transform"
            >
              <span className="relative">
                <ShoppingBag className="size-6" />
                <motion.span
                  key={cartQty}
                  initial={{ scale: 1.6 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2.5 grid size-5 place-items-center rounded-full bg-maiz text-[11px] font-bold text-tinta"
                >
                  {cartQty}
                </motion.span>
              </span>
              <span className="flex-1 text-left font-semibold">{order ? "Revisar adición" : "Revisar pedido"}</span>
              <span className="rounded-xl bg-teja px-3 py-2 font-semibold tabular">{money(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={order ? `Adición · mesa ${table}` : `Pedido · mesa ${table}`}
        footer={
          <Button size="lg" className="w-full" icon={Send} loading={sending} onClick={send}>
            Enviar a caja · {money(cartTotal)}
          </Button>
        }
      >
        <ul className="divide-y divide-linea">
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <motion.li
                key={l.p._id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 py-3">
                  <ProductThumb product={l.p} className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.p.name}</p>
                    <p className="text-sm text-tinta-2 tabular">{money(price(l.p) * l.qty)}</p>
                  </div>
                  <Stepper qty={l.qty} max={available(l.p)} onQty={(n) => setQty(l.p, n)} />
                </div>
                <input
                  value={l.note}
                  onChange={(e) => setCart((c) => ({ ...c, [l.p._id]: { ...c[l.p._id], note: e.target.value } }))}
                  placeholder="Nota: sin cebolla, bien asado…"
                  maxLength={120}
                  className="input mb-3 h-10 text-sm"
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Sheet>
    </>
  );
}

function ProductCard({ p, promo, qty, onQty }: { p: Product; promo?: number; qty: number; onQty: (n: number) => void }) {
  const max = available(p);
  const out = max <= 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={cn("card relative flex flex-col overflow-hidden", qty > 0 && "ring-2 ring-teja", out && "opacity-55")}
    >
      <button disabled={out || qty >= max} onClick={() => onQty(qty + 1)} className="text-left active:scale-[0.98] transition-transform">
        <span className="relative block">
          <ProductThumb product={p} className="aspect-[4/3] w-full" />
          {promo !== undefined && <PromoBadge className="absolute top-2 left-2" />}
        </span>
        <div className="p-3 pb-2">
          <p className="line-clamp-2 leading-tight font-semibold">{p.name}</p>
          <p className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-semibold text-teja tabular">
              {promo !== undefined && <span className="mr-1 text-xs font-normal text-tinta-2 line-through">{money(p.salePrice)}</span>}
              {money(promo ?? p.salePrice)}
            </span>
            {tracksStock(p.category) && (
              <span className={cn("text-xs", p.stock <= 5 ? "font-semibold text-teja-2" : "text-tinta-2")}>{out ? "Agotado" : `${p.stock} disp.`}</span>
            )}
          </p>
        </div>
      </button>
      <div className="mt-auto px-3 pb-3">
        {qty > 0 ? (
          <Stepper qty={qty} max={max} onQty={onQty} wide />
        ) : (
          <Button size="sm" variant="outline" className="w-full" icon={Plus} disabled={out} onClick={() => onQty(1)}>
            Agregar
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Stepper({ qty, max, onQty, wide }: { qty: number; max: number; onQty: (n: number) => void; wide?: boolean }) {
  return (
    <div className={cn("flex h-9 items-center rounded-xl bg-cal-2", wide && "w-full justify-between")}>
      <button aria-label="Quitar uno" onClick={() => onQty(qty - 1)} className="grid h-9 w-9 place-items-center rounded-xl active:scale-90 transition-transform">
        {qty === 1 ? <Trash className="size-4 text-teja" /> : <Minus className="size-4" />}
      </button>
      <motion.span key={qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-7 text-center font-semibold tabular">
        {qty}
      </motion.span>
      <button aria-label="Agregar uno" disabled={qty >= max} onClick={() => onQty(qty + 1)} className="grid h-9 w-9 place-items-center rounded-xl active:scale-90 transition-transform disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Lo que la mesa ya pidió: estados por producto, quitar y marcar entregado. */
function CurrentOrder({ table, onChange }: { table: number; onChange: () => void }) {
  const { data } = useOrders();
  const order = data?.find((o) => o.table === table);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!data) return <Skeleton className="h-40" />;
  if (!order)
    return (
      <div className="card p-5">
        <Empty icon={UtensilsCrossed} title="Mesa libre" text="Elige productos de la carta y envíalos a caja." />
      </div>
    );

  const ready = order.items.filter((i) => i.status === "servido");

  async function deliver() {
    setBusy(true);
    try {
      await api(`/api/orders/${order!._id}`, { method: "PATCH", body: { action: "deliver" } });
      toast.success("Pedido entregado en la mesa");
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    setBusy(true);
    try {
      await api(`/api/orders/${order!._id}`, { method: "PATCH", body: { action: "cancel" } });
      toast.success(`Pedido de mesa ${table} cancelado`);
      setConfirmCancel(false);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-linea px-4 py-3">
        <p className="font-display text-xl">La cuenta</p>
        <StatusChip status={order.stage} />
      </div>
      <ul className="max-h-[50dvh] divide-y divide-linea overflow-y-auto overscroll-contain lg:max-h-[55dvh]">
        <AnimatePresence initial={false}>
          {order.items.map((i) => (
            <ItemRow key={i._id} item={i} orderId={order._id} owner={order.waiterName} onChange={onChange} />
          ))}
        </AnimatePresence>
      </ul>
      <div className="space-y-3 border-t border-linea bg-cal-2/50 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-tinta-2">Total</span>
          <span className="font-display text-3xl tabular">{money(order.total)}</span>
        </div>
        <AnimatePresence>
          {ready.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Button variant="success" size="lg" className="w-full" icon={Check} loading={busy} onClick={deliver}>
                Pedido entregado ({ready.reduce((s, i) => s + i.qty, 0)})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          {confirmCancel ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-teja/30 bg-teja/8 p-3"
            >
              <p className="text-sm text-teja-2">¿Cancelar todo el pedido de la mesa {table}? Lo no preparado vuelve al inventario y la mesa queda libre.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="dark" onClick={() => setConfirmCancel(false)}>
                  No
                </Button>
                <Button size="sm" variant="primary" icon={X} loading={busy} onClick={cancelOrder}>
                  Sí, cancelar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Button variant="danger" size="sm" className="w-full" icon={X} onClick={() => setConfirmCancel(true)}>
                Cancelar pedido
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ItemRow({ item, orderId, owner, onChange }: { item: OrderItem; orderId: string; owner: string; onChange: () => void }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null); // null = no se está editando

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  async function remove() {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      await api(`/api/orders/${orderId}`, { method: "PATCH", body: { action: "remove", itemId: item._id } });
      toast.success(`${item.name} quitado de la cuenta`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  // Lo que hizo otro mesero (o caja) en este pedido se resalta para el dueño.
  const addedByOther = item.addedByName && item.addedByName !== owner ? item.addedByName : null;
  const noteByOther = item.note && item.noteByName && item.noteByName !== owner ? item.noteByName : null;
  const other = addedByOther ?? noteByOther;

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/orders/${orderId}`, { method: "PATCH", body: { action: "note", itemId: item._id, note: note ?? "" } });
      toast.success(`Detalle de ${item.name} actualizado`);
      setNote(null);
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      className="overflow-hidden"
    >
      <div className={cn("flex items-start gap-3 px-4 py-3", other && "border-l-4 border-puerta bg-puerta/6 pl-3")}>
        <span className="mt-0.5 w-7 font-semibold tabular">{item.qty}×</span>
        <div className="min-w-0 flex-1">
          <p className={cn("leading-tight font-medium", addedByOther && "underline decoration-puerta decoration-[3px] underline-offset-4")}>{item.name}</p>
          {note === null ? (
            item.note && (
              <p className={cn("text-sm text-tinta-2 italic", noteByOther && "text-puerta underline decoration-puerta decoration-2 underline-offset-4")}>
                “{item.note}”
              </p>
            )
          ) : (
            <form onSubmit={saveNote} className="mt-1.5 flex gap-2">
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                enterKeyHint="done"
                placeholder="Sin cebolla, bien asado…"
                className="input h-10 min-w-0 flex-1 py-0"
              />
              <Button type="submit" size="sm" loading={busy} aria-label="Guardar detalle" icon={Check} />
              <Button type="button" size="sm" variant="ghost" onClick={() => setNote(null)}>
                ✕
              </Button>
            </form>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusChip status={item.status} />
            {other && (
              <span className="rounded-full bg-puerta px-2 py-0.5 text-[11px] font-bold text-white">
                {addedByOther ? `Agregado por ${addedByOther}` : `Detalle por ${noteByOther}`}
              </span>
            )}
            {item.status === "pendiente" && note === null && (
              <button
                onClick={() => setNote(item.note)}
                className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-puerta transition active:scale-95"
              >
                <PencilLine className="size-3.5" /> {item.note ? "Editar detalle" : "Detalle"}
              </button>
            )}
            {item.round > 1 && <span className="text-xs text-tinta-2">Ronda {item.round}</span>}
            {item.promo && <PromoBadge />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular">{money(item.price * item.qty)}</span>
          <button
            onClick={remove}
            disabled={busy}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95",
              armed ? "bg-teja text-white" : "text-tinta-2/70",
            )}
          >
            <Trash className="size-3.5" />
            {armed && "¿Quitar?"}
          </button>
        </div>
      </div>
    </motion.li>
  );
}
