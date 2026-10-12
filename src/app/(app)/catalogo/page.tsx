"use client";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { PromoBadge, PromoCard, PromoCarousel, usePromos } from "@/components/promos";
import { CATEGORY_META, cn, Empty, ErrorNote, PageHeader, ProductThumb, Skeleton } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { CATEGORIES, CATEGORY_LABEL, LOW_STOCK, tracksStock } from "@/lib/constants";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function CatalogoPage() {
  const { data, error } = useLive<Product[]>("/api/products", 30000);
  const { promos, priceOf } = usePromos();
  const groups = CATEGORIES.map((c) => ({ c, items: (data ?? []).filter((p) => p.category === c) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader title="La carta" subtitle="Todos los productos disponibles, por categoría." />
      <ErrorNote message={error} />

      {promos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-3xl">
            <PromoBadge /> Promociones de hoy
          </h2>
          <PromoCarousel promos={promos} render={(p, i) => <PromoCard promo={p} index={i} />} />
        </section>
      )}

      {data && groups.length > 0 && (
        <nav className="scroll-x sticky top-[calc(env(safe-area-inset-top,0px)+4.4rem)] z-10 -mx-4 mb-6 bg-cal/90 px-4 py-2 backdrop-blur-md sm:mx-0 sm:px-0">
          {groups.map(({ c, items }) => {
            const M = CATEGORY_META[c];
            return (
              <a key={c} href={`#${c}`} className="flex shrink-0 items-center gap-2 rounded-full border border-linea bg-white px-4 py-2 text-sm font-semibold active:scale-95 transition-transform">
                <M.icon className={cn("size-4", M.color)} />
                {CATEGORY_LABEL[c]}
                <span className="text-tinta-2">{items.length}</span>
              </a>
            );
          })}
        </nav>
      )}

      {!data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty icon={BookOpen} title="La carta está vacía" />
      ) : (
        <div className="space-y-10">
          {groups.map(({ c, items }) => {
            const M = CATEGORY_META[c];
            return (
              <section key={c} id={c} className="scroll-mt-36">
                <div className="mb-4 flex items-center gap-3">
                  <span className={cn("grid size-11 place-items-center rounded-2xl", M.tint)}>
                    <M.icon className={cn("size-6", M.color)} />
                  </span>
                  <h2 className="font-display text-3xl">{CATEGORY_LABEL[c]}</h2>
                  <span className="h-px flex-1 bg-linea" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((p, i) => (
                    <motion.article
                      key={p._id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: (i % 4) * 0.05, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                      className="card overflow-hidden"
                    >
                      <div className="relative">
                        <ProductThumb product={p} className="aspect-[4/3] w-full" />
                        {priceOf.has(p._id) && <PromoBadge className="absolute top-2 left-2" />}
                        <span className="absolute right-2 bottom-2 rounded-full bg-white/95 px-2.5 py-1 text-sm font-bold text-teja shadow-sm tabular">{money(priceOf.get(p._id) ?? p.salePrice)}</span>
                      </div>
                      <div className="p-3">
                        <h3 className="leading-tight font-semibold">{p.name}</h3>
                        {p.description && <p className="mt-1 line-clamp-2 text-sm text-tinta-2">{p.description}</p>}
                        {tracksStock(p.category) ? (
                          <p className={cn("mt-2 text-xs font-semibold", p.stock === 0 ? "text-teja" : p.stock <= LOW_STOCK ? "text-[#a8741b]" : "text-balcon")}>
                            {p.stock === 0 ? "Agotado" : `${p.stock} disponibles`}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-balcon">Preparado al momento</p>
                        )}
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
