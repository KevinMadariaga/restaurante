"use client";
import { createContext, useContext } from "react";
import { useLive } from "@/hooks/use-live";
import type { Session } from "@/lib/jwt";
import type { Order } from "@/lib/types";

type Ctx = ReturnType<typeof useLive<Order[]>> & { me: Session };
const OrdersCtx = createContext<Ctx | null>(null);

/** Un solo polling de pedidos abiertos compartido por las páginas y las alertas. */
export function OrdersProvider({ me, children }: { me: Session; children: React.ReactNode }) {
  const live = useLive<Order[]>("/api/orders", 3000);
  return <OrdersCtx.Provider value={{ ...live, me }}>{children}</OrdersCtx.Provider>;
}

export function useOrders() {
  const c = useContext(OrdersCtx);
  if (!c) throw new Error("useOrders fuera de OrdersProvider");
  return c;
}
