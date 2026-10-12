import { body, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { productSchema } from "@/lib/validators";
import { Product } from "@/models/Product";
import { decodeImage } from "./image-data";

export const GET = route(async (req) => {
  const s = await requireRole();
  const all = new URL(req.url).searchParams.get("all") === "1" && s.role === "admin";
  return Product.find(all ? {} : { active: true })
    .select(s.role === "admin" ? "" : "-costPrice")
    .sort({ category: 1, name: 1 })
    .lean();
});

export const POST = route(async (req) => {
  await requireRole("admin");
  const { image, ...data } = productSchema.parse(await body(req));
  const p = await Product.create({ ...data, ...(image && { image: decodeImage(image), imageV: Date.now() }) });
  return { _id: p._id };
});
