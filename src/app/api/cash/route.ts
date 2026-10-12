import { body, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { cashSchema } from "@/lib/validators";
import * as cash from "@/services/cash";

export const GET = route(async () => {
  await requireRole("cajero", "admin");
  const [session, closed] = await Promise.all([cash.current(), cash.history()]);
  return { current: session, history: closed };
});

export const POST = route(async (req) => {
  const user = await requireRole("cajero", "admin");
  const input = cashSchema.parse(await body(req));
  return input.action === "open" ? cash.open(user, input.amount) : cash.close(user, input.counted, input.note);
});
