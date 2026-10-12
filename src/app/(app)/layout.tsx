import { redirect } from "next/navigation";
import { ChangeNotices, OrderAlerts } from "@/components/alerts";
import { OrdersProvider } from "@/components/orders-context";
import { PromoModal } from "@/components/promos";
import { Shell } from "@/components/shell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();
  if (!me) redirect("/login");
  return (
    <OrdersProvider me={me}>
      <Shell me={me}>{children}</Shell>
      <OrderAlerts />
      <ChangeNotices />
      <PromoModal />
    </OrdersProvider>
  );
}
