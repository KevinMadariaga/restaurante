"use client";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLive } from "@/hooks/use-live";
import { tracksStock } from "@/lib/constants";
import { isoDay, money } from "@/lib/format";
import type { Promotion } from "@/lib/types";
import { useOrders } from "./orders-context";
import { Button, cn, ProductThumb, Sheet } from "./ui";

/** Promociones de hoy (solo de productos activos) y precio promocional por producto. */
export function usePromos() {
  const { data } = useLive<Promotion[]>("/api/promotions", 60000);
  return useMemo(() => {
    const list = (data ?? []).filter((p) => p.product?.active);
    return { promos: list, priceOf: new Map(list.map((p) => [p.product._id, p.price])) };
  }, [data]);
}

export function PromoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-maiz px-2 py-0.5 text-[11px] font-bold text-tinta uppercase shadow-sm", className)}>
      <Sparkles className="size-3" /> Promo
    </span>
  );
}

const pct = (p: Promotion) => Math.round((1 - p.price / p.product.salePrice) * 100);

/**
 * Tarjeta de promoción. Todas miden lo mismo: imagen 16:10, nombre y detalle con alto fijo
 * (2 líneas) y precio pegado abajo, así una fila de promos nunca pierde simetría.
 */
export function PromoCard({ promo, footer, index = 0 }: { promo: Promotion; footer?: ReactNode; index?: number }) {
  const p = promo.product;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + Math.min(index, 4) * 0.06, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-maiz bg-white shadow-[0_14px_30px_-18px_rgb(232_168_56/0.9)]"
    >
      <div className="relative shrink-0">
        <ProductThumb product={p} className="aspect-[16/10] w-full" />
        <span className="absolute top-3 left-3 rounded-full bg-teja px-3 py-1 font-display text-lg text-white shadow">-{pct(promo)}%</span>
        <PromoBadge className="absolute top-3 right-3" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="h-4 truncate text-xs leading-4 font-bold tracking-wider text-teja uppercase">{promo.title}</p>
        <h3 className="mt-1 line-clamp-2 h-[2.5em] font-display text-2xl leading-[1.25]">{p.name}</h3>
        <p className="mt-1 line-clamp-2 h-10 text-sm leading-5 text-tinta-2">{p.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="leading-none">
            <p className="text-sm text-tinta-2 line-through tabular">{money(p.salePrice)}</p>
            <p className="mt-1 font-display text-3xl text-teja tabular">{money(promo.price)}</p>
          </div>
          <p className={cn("text-xs font-semibold", tracksStock(p.category) && p.stock === 0 ? "text-teja" : "text-balcon")}>
            {!tracksStock(p.category) ? "Al momento" : p.stock === 0 ? "Agotado" : `${p.stock} disponibles`}
          </p>
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </motion.article>
  );
}

/**
 * Fila deslizable de promociones (scroll-snap nativo). Con más de una muestra
 * puntos indicadores, contador y flechas en escritorio.
 */
export function PromoCarousel({ promos, render }: { promos: Promotion[]; render: (p: Promotion, i: number) => ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const many = promos.length > 1;

  function onScroll() {
    const el = track.current;
    if (!el?.children.length) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const step = (el.children[0] as HTMLElement).offsetWidth + 12; // ancho tarjeta + gap-3
    setActive(atEnd ? promos.length - 1 : Math.round(el.scrollLeft / step));
  }

  function goTo(i: number) {
    const el = track.current;
    const card = el?.children[Math.max(0, Math.min(i, promos.length - 1))] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={onScroll}
        className="scroll-x snap-x snap-mandatory items-stretch gap-3 overscroll-x-contain pb-1"
      >
        {promos.map((p, i) => (
          <div key={p._id} className="w-[min(80vw,300px)] shrink-0 snap-start">
            {render(p, i)}
          </div>
        ))}
      </div>

      {many && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            aria-label="Promoción anterior"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            className="hidden size-9 place-items-center rounded-full border border-linea bg-white transition active:scale-90 disabled:opacity-30 sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Promociones">
            {promos.map((p, i) => (
              <button
                key={p._id}
                role="tab"
                aria-selected={i === active}
                aria-label={`Ver promoción ${i + 1}`}
                onClick={() => goTo(i)}
                className="grid h-6 place-items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300 ease-(--ease-out)",
                    i === active ? "w-6 bg-teja" : "w-2 bg-tinta/20",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-tinta-2 tabular">
            {active + 1}/{promos.length}
          </span>
          <button
            aria-label="Siguiente promoción"
            onClick={() => goTo(active + 1)}
            disabled={active === promos.length - 1}
            className="hidden size-9 place-items-center rounded-full border border-linea bg-white transition active:scale-90 disabled:opacity-30 sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Al mesero le aparecen las promos del día al entrar; vuelve a salir si el admin agrega otra. */
export function PromoModal() {
  const { me } = useOrders();
  const { promos } = usePromos();
  const [open, setOpen] = useState(false);
  const key = `pp_promos_${isoDay()}_${promos.map((p) => p._id).join(".")}`;

  useEffect(() => {
    if (me.role !== "mesero" || !promos.length) return;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    setOpen(true);
  }, [key, me.role, promos.length]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      wide
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-6 text-maiz" /> {promos.length === 1 ? "Promoción del día" : "Promociones del día"}
        </span>
      }
      footer={
        <Button size="lg" className="w-full" onClick={close}>
          ¡Entendido, a ofrecerlas!
        </Button>
      }
    >
      <p className="mb-4 text-tinta-2">Recuérdaselas a cada mesa. El precio especial se aplica solo al tomar el pedido.</p>
      <PromoCarousel promos={promos} render={(p, i) => <PromoCard promo={p} index={i} />} />
    </Sheet>
  );
}
