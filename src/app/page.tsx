import { redirect } from "next/navigation";
import { HOME } from "@/lib/constants";
import { getSession } from "@/lib/session";

export default async function Home() {
  const s = await getSession();
  redirect(s ? HOME[s.role] : "/login");
}
