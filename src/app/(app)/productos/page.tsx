"use client";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Package, Plus, Search, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, CATEGORY_META, cn, Empty, ErrorNote, Field, MoneyInput, PageHeader, ProductThumb, Segmented, Sheet, Skeleton } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { CATEGORIES, CATEGORY_LABEL, LOW_STOCK, tracksStock, type Category } from "@/lib/constants";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductosPage() {
  const { data, error, reload } = useLive<Product[]>("/api/products?all=1", 0);
  const [cat, setCat] = useState<Category | "todo">("todo");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | "new">();
  const [seq, setSeq] = useState(0); // remonta el formulario en cada apertura
  const edit = (p: Product | "new") => (setEditing(p), setSeq((n) => n + 1));

  const list = (data ?? []).filter((p) => (cat === "todo" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const low = (data ?? []).filter((p) => p.active && tracksStock(p.category) && p.stock <= LOW_STOCK).length;

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={data ? `${data.length} productos${low ? ` · ${low} con poco inventario` : ""}` : "Cargando…"}
        action={
          <Button icon={Plus} onClick={() => edit("new")}>
            Nuevo producto
          </Button>
        }
      />
      <ErrorNote message={error} />

      <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tinta-2/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input h-12 pl-11" />
        </div>
        <Segmented
          id="prod-cat"
          value={cat}
          onChange={setCat}
          options={[{ value: "todo", label: "Todos" }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c], icon: CATEGORY_META[c].icon }))]}
        />
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Empty icon={Package} title="No hay productos" text="Crea el primero con el botón “Nuevo producto”." />
      ) : (
        <motion.ul layout className="grid gap-2 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {list.map((p) => {
              const margin = p.salePrice ? Math.round(((p.salePrice - (p.costPrice ?? 0)) / p.salePrice) * 100) : 0;
              return (
                <motion.li
                  key={p._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  <button
                    onClick={() => edit(p)}
                    className={cn("card flex w-full items-center gap-3 p-2.5 pr-4 text-left transition-transform active:scale-[0.99]", !p.active && "opacity-50")}
                  >
                    <ProductThumb product={p} className="size-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {p.name} {!p.active && <span className="text-xs font-normal text-tinta-2">(inactivo)</span>}
                      </p>
                      <p className="text-xs text-tinta-2">
                        {CATEGORY_LABEL[p.category]} · costo {money(p.costPrice ?? 0)} · margen {margin}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular">{money(p.salePrice)}</p>
                      {tracksStock(p.category) ? (
                        <p className={cn("text-xs font-semibold tabular", p.stock <= LOW_STOCK ? "text-teja" : "text-tinta-2")}>{p.stock} und.</p>
                      ) : (
                        <p className="text-xs text-tinta-2">Al momento</p>
                      )}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <ProductForm key={seq} product={editing} onClose={() => setEditing(undefined)} onSaved={reload} />
    </>
  );
}

/** Reduce la foto en el navegador (máx. 720px, webp/jpeg) antes de subirla. */
async function compress(file: File) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 720 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const webp = c.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", 0.85);
}

const EMPTY = { name: "", category: "platillos" as Category, description: "", salePrice: "", costPrice: "", stock: "", active: true };

function ProductForm({ product, onClose, onSaved }: { product?: Product | "new"; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState<string | null>(); // undefined = sin cambios, null = quitar
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [current, setCurrent] = useState<Product | "new">();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Rellenar el formulario al abrir otro producto.
  if (product && product !== current) {
    setCurrent(product);
    setImage(undefined);
    setError(undefined);
    setForm(
      product === "new"
        ? EMPTY
        : {
            name: product.name,
            category: product.category,
            description: product.description,
            salePrice: String(product.salePrice),
            costPrice: String(product.costPrice ?? 0),
            stock: String(product.stock),
            active: product.active,
          },
    );
  }
  const editing = current && current !== "new" ? current : undefined;
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => v.replace(/\D/g, "");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setImage(await compress(f));
    } catch {
      toast.error("No se pudo leer la imagen");
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    setError(undefined);
    try {
      await api(`/api/products/${editing._id}`, { method: "DELETE" });
      toast.success(`${editing.name} eliminado`);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const payload = { ...form, salePrice: Number(form.salePrice), costPrice: Number(form.costPrice) || 0, stock: tracksStock(form.category) ? Number(form.stock) || 0 : 0, ...(image !== undefined && { image }) };
    try {
      if (editing) await api(`/api/products/${editing._id}`, { method: "PATCH", body: payload });
      else await api("/api/products", { body: payload });
      toast.success(editing ? "Producto actualizado" : "Producto creado");
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preview = image === null ? null : image ?? (editing?.imageV ? `/api/products/${editing._id}/image?v=${editing.imageV}` : null);
  const sale = Number(form.salePrice) || 0;
  const margin = sale ? Math.round(((sale - (Number(form.costPrice) || 0)) / sale) * 100) : 0;

  return (
    <Sheet
      open={!!product}
      onClose={onClose}
      title={editing ? "Editar producto" : "Nuevo producto"}
      footer={
        <Button form="product-form" type="submit" size="lg" className="w-full" loading={busy}>
          {editing ? "Guardar cambios" : "Crear producto"}
        </Button>
      }
    >
      <form id="product-form" onSubmit={save} className="space-y-4">
        <ErrorNote message={error} />

        <div className="flex items-center gap-4">
          <label className="relative grid size-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-linea bg-white text-tinta-2 transition active:scale-[0.98]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                <ImagePlus className="size-7" />
                Foto
              </span>
            )}
            <input type="file" accept="image/*" onChange={pick} className="sr-only" />
          </label>
          <div className="text-sm text-tinta-2">
            <p>Toca para {preview ? "cambiar" : "subir"} la foto. Se optimiza automáticamente.</p>
            {preview && (
              <button type="button" onClick={() => setImage(null)} className="mt-2 inline-flex items-center gap-1 font-semibold text-teja">
                <Trash className="size-4" /> Quitar foto
              </button>
            )}
          </div>
        </div>

        <Field label="Nombre">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="Bandeja paisa" />
        </Field>

        <div>
          <span className="label">Categoría</span>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const M = CATEGORY_META[c];
              const on = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-all active:scale-95",
                    on ? "border-tinta bg-tinta text-cal" : "border-linea bg-white text-tinta-2",
                  )}
                >
                  <M.icon className="size-5" />
                  {CATEGORY_LABEL[c]}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Detalle">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            maxLength={300}
            className="input resize-none"
            placeholder="Frijoles, arroz, chicharrón, carne molida, huevo, maduro y arepa"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de venta">
            <MoneyInput required value={form.salePrice} onChange={(v) => set("salePrice", v)} />
          </Field>
          <Field label="Precio de compra">
            <MoneyInput value={form.costPrice} onChange={(v) => set("costPrice", v)} />
          </Field>
        </div>
        <p className={cn("-mt-2 text-sm", margin < 0 ? "text-teja" : "text-tinta-2")}>
          Margen: <b>{margin}%</b> · ganancia por unidad {money(sale - (Number(form.costPrice) || 0))}
        </p>

        <AnimatePresence initial={false} mode="wait">
          {tracksStock(form.category) ? (
            <motion.div key="stock" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field label="Cantidad disponible">
                <input required inputMode="numeric" value={form.stock} onChange={(e) => set("stock", num(e.target.value))} className="input tabular" placeholder="0" />
              </Field>
            </motion.div>
          ) : (
            <motion.p key="nostock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl bg-cal-2 px-4 py-3 text-sm text-tinta-2">
              Los platillos se preparan al momento: no llevan control de cantidad.
            </motion.p>
          )}
        </AnimatePresence>

        <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
          <span>
            <span className="block font-semibold">Disponible en la carta</span>
            <span className="text-sm text-tinta-2">Si lo apagas, los meseros no lo verán.</span>
          </span>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="peer sr-only" />
          <span className="relative h-7 w-12 rounded-full bg-cal-3 transition-colors peer-checked:bg-balcon after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5" />
        </label>

        {editing && (
          <div className="border-t border-linea pt-4">
            <AnimatePresence initial={false} mode="wait">
              {confirmDelete ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl bg-teja/10 p-4"
                >
                  <p className="font-semibold text-teja-2">¿Borrar “{editing.name}” para siempre?</p>
                  <p className="mt-1 text-sm text-tinta-2">No se puede deshacer. Las ventas anteriores se conservan. Si solo quieres ocultarlo, apaga “Disponible en la carta”.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" icon={Trash} loading={busy} onClick={remove}>
                      Sí, borrar
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button type="button" variant="danger" className="w-full" icon={Trash} onClick={() => setConfirmDelete(true)}>
                    Eliminar producto
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </form>
    </Sheet>
  );
}
