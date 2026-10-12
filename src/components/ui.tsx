"use client";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { CupSoda, Cookie, IceCreamCone, LoaderCircle, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import type { Category, ItemStatus } from "@/lib/constants";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- Botón ---------- */

const variants = {
  primary: "bg-teja text-white shadow-[0_6px_16px_-6px_rgb(194_69_45/0.7)] [@media(hover:hover)]:hover:bg-teja-2",
  dark: "bg-tinta text-cal [@media(hover:hover)]:hover:bg-tinta/90",
  success: "bg-balcon text-white shadow-[0_6px_16px_-6px_rgb(31_107_82/0.7)] [@media(hover:hover)]:hover:bg-balcon-2",
  outline: "border border-linea bg-white/70 text-tinta [@media(hover:hover)]:hover:bg-white",
  ghost: "text-tinta-2 [@media(hover:hover)]:hover:bg-cal-2",
  danger: "bg-teja/10 text-teja-2 [@media(hover:hover)]:hover:bg-teja/15",
};
const sizes = { sm: "h-9 px-3 text-sm gap-1.5", md: "h-11 px-4 gap-2", lg: "h-14 px-6 text-lg gap-2.5" };

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({ variant = "primary", size = "md", loading, icon: Icon, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold whitespace-nowrap",
        "transition-[transform,background-color,opacity] duration-150 ease-(--ease-out) active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-[1.15em] animate-spin" /> : Icon && <Icon className="size-[1.15em]" />}
      {children}
    </button>
  );
}

/* ---------- Formularios ---------- */

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="block text-sm text-teja-2">{error}</span>}
    </label>
  );
}

const thousands = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/**
 * Campo de dinero: muestra separador de miles (1.000) y un "$" a la izquierda.
 * `value` y `onChange` trabajan con solo dígitos ("1000"), listos para Number().
 */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "0",
  ...p
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: string; onChange: (digits: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-semibold text-tinta-2/70">$</span>
      <input
        {...p}
        inputMode="numeric"
        autoComplete="off"
        value={value ? thousands.format(Number(value)) : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
        placeholder={placeholder}
        className={cn("input pl-8 tabular", className)}
      />
    </div>
  );
}

/** Selector segmentado con indicador animado. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  id: string;
}) {
  return (
    <div role="tablist" className="scroll-x rounded-2xl bg-cal-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "text-tinta" : "text-tinta-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-white shadow-sm"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon && <o.icon className="size-4" />}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Hoja inferior (móvil) / modal (escritorio) ---------- */

let scrollLocks = 0;

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // Contador: varias hojas pueden abrirse/cerrarse en cadena sin dejar el scroll bloqueado.
    if (scrollLocks++ === 0) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      if (--scrollLocks === 0) document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-tinta/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onClose()}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-cal shadow-2xl sm:rounded-3xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            <div
              className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing sm:hidden"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-cal-3" />
            </div>
            <header
              className="flex items-center justify-between gap-3 px-5 pt-2 pb-3 sm:pt-5"
              onPointerDown={(e) => e.pointerType === "touch" && drag.start(e)}
            >
              <h2 className="font-display text-2xl leading-tight">{title}</h2>
              <button onClick={onClose} aria-label="Cerrar" className="grid size-9 place-items-center rounded-full bg-cal-2 text-tinta-2 active:scale-95">
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <footer className="border-t border-linea bg-white/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Categorías y estados ---------- */

export const CATEGORY_META: Record<Category, { icon: LucideIcon; color: string; tint: string }> = {
  platillos: { icon: UtensilsCrossed, color: "text-teja", tint: "bg-teja/12" },
  bebidas: { icon: CupSoda, color: "text-puerta", tint: "bg-puerta/12" },
  mecatos: { icon: Cookie, color: "text-[#a8741b]", tint: "bg-maiz/20" },
  helados: { icon: IceCreamCone, color: "text-rosa", tint: "bg-rosa/15" },
};

export const STATUS_META: Record<ItemStatus, { label: string; cls: string; dot: string }> = {
  pendiente: { label: "En preparación", cls: "bg-maiz/20 text-[#8a5d10]", dot: "bg-maiz" },
  servido: { label: "Listo para llevar", cls: "bg-puerta/12 text-puerta", dot: "bg-puerta" },
  entregado: { label: "En la mesa", cls: "bg-balcon/12 text-balcon", dot: "bg-balcon" },
};

export function StatusChip({ status, className }: { status: ItemStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", m.cls, className)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function ProductThumb({
  product,
  className,
}: {
  product: { _id: string; category: Category; imageV?: number; name: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const m = CATEGORY_META[product.category];
  if (product.imageV && !failed)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/products/${product._id}/image?v=${product.imageV}`}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
    );
  return (
    <div className={cn("grid place-items-center", m.tint, className)}>
      <m.icon className={cn("size-1/3", m.color)} strokeWidth={1.6} />
    </div>
  );
}

/* ---------- Varios ---------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div>
        <h1 className="font-display text-3xl leading-none sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-tinta-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-linea px-6 py-14 text-center animate-rise">
      <Icon className="size-10 text-tinta-2/40" strokeWidth={1.4} />
      <p className="mt-3 font-display text-xl">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-tinta-2">{text}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-cal-2", className)} />;
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mb-4 rounded-xl bg-teja/10 px-4 py-3 text-sm text-teja-2">{message}</p>;
}
