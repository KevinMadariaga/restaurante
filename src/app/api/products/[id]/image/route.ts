import { HttpError, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { Product } from "@/models/Product";

export const GET = route(async (_req, { params }) => {
  await requireRole();
  const { id } = await params;
  const p = await Product.findById(id).select("+image");
  if (!p?.image?.data) throw new HttpError(404, "Sin imagen");
  return new Response(new Uint8Array(p.image.data), {
    headers: {
      "Content-Type": p.image.mime ?? "image/webp",
      // La URL lleva ?v=imageV, así que cada versión puede cachearse para siempre.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
