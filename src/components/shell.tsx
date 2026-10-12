"use client";
import { motion } from "motion/react";
import { BadgePercent, BookOpen, ChartColumn, ClipboardList, LayoutGrid, LogOut, Package, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ACCESS, ROLE_LABEL } from "@/lib/constants";
import type { Session } from "@/lib/jwt";
import { cn } from "./ui";

const NAV: { href: keyof typeof ACCESS; label: string; icon: LucideIcon }[] = [
  { href: "/mesas", label: "Mesas", icon: LayoutGrid },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/caja", label: "Caja", icon: Wallet },
  { href: "/ventas", label: "Ventas", icon: ChartColumn },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/promociones", label: "Promos", icon: BadgePercent },
  { href: "/catalogo", label: "Carta", icon: BookOpen },
  { href: "/usuarios", label: "Usuarios", icon: Users },
];

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M6 28 32 9l26 19z" fill="var(--color-teja)" />
      <rect x="13" y="28" width="38" height="27" fill="#fff" stroke="var(--color-tinta)" strokeWidth="2.5" />
      <rect x="13" y="49" width="38" height="6" fill="var(--color-balcon)" />
      <rect x="28" y="36" width="9" height="19" rx="1" fill="var(--color-puerta)" />
      <rect x="17" y="33" width="7" height="8" fill="var(--color-maiz)" />
      <rect x="41" y="33" width="7" height="8" fill="var(--color-maiz)" />
    </svg>
  );
}

export function Shell({ me, children }: { me: Session; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => ACCESS[n.href].includes(me.role));
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-linea/70 bg-cal/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="zocalo h-1.5" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-9" />
            <span className="font-display text-xl leading-none">
              Pueblito <span className="text-teja">Paisa</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {items.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive(n.href) ? "text-cal" : "text-tinta-2 [@media(hover:hover)]:hover:text-tinta",
                )}
              >
                {isActive(n.href) && (
                  <motion.span layoutId="nav-desk" className="absolute inset-0 rounded-full bg-tinta" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />
                )}
                <n.icon className="relative size-4" />
                <span className="relative">{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{me.name}</p>
              <p className="text-xs text-tinta-2">{ROLE_LABEL[me.role]}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Cerrar sesión"
              className="grid size-10 place-items-center rounded-full border border-linea bg-white/70 text-tinta-2 transition active:scale-95 [@media(hover:hover)]:hover:text-teja"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">{children}</main>

      {/* Barra inferior estilo app en móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-cal/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden">
        <div className="scroll-x justify-around gap-0 px-1">
          {items.map((n) => {
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} className="relative flex min-w-16 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold">
                {active && (
                  <motion.span layoutId="nav-mob" className="absolute top-1.5 h-8 w-14 rounded-full bg-teja/12" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                )}
                <n.icon className={cn("relative mt-1 size-5 transition-colors", active ? "text-teja" : "text-tinta-2")} />
                <span className={cn("relative mt-1", active ? "text-tinta" : "text-tinta-2")}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
