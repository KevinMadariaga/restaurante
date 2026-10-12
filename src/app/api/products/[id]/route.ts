import { body, HttpError, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { productSchema } from "@/lib/validators";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Promotion } from "@/models/Promotion";
import { decodeImage } from "../image-data";

export const PATCH = route(async (req, { params }) => {
  await requireRole("admin");
  const { id } = await params;
  const { image, ...data } = productSchema.partial().parse(await body(req));
  const update: Record<string, unknown> = { ...data };
  if (image) Object.assign(update, { image: decodeImage(image), imageV: Date.now() });
  if (image === null) Object.assign(update, { $unset: { image: 1 }, imageV: 0 });
  const p = await Product.findByIdAndUpdate(id, update, { runValidators: true });
  if (!p) throw new HttpError(404, "Producto no encontrado");
  return { ok: true };
});


/**
 * Borra el producto definitivamente. Las ventas pasadas no se afectan porque cada
 * pedido guarda su propia copia de nombre y precio. Se bloquea si está en un pedido abierto.
 */
export const DELETE = route(async (_req, { params }) => {
  await requireRole("admin");
  const { id } = await params;
  const inUse = await Order.findOne({ status: "abierto", "items.product": id }, "table").lean();
  if (inUse) throw new HttpError(409, `Está en el pedido abierto de la mesa ${inUse.table}; cóbralo o quítalo antes de borrar`);
  const p = await Product.findByIdAndDelete(id);
  if (!p) throw new HttpError(404, "Producto no encontrado");
  await Promotion.deleteMany({ product: id });
  return { ok: true };
});
