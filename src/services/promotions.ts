import "server-only";
import { isoDay } from "@/lib/format";
import { HttpError, isDuplicate } from "@/lib/http";
import { Product } from "@/models/Product";
import { Promotion } from "@/models/Promotion";

const PRODUCT_FIELDS = "name category description salePrice stock imageV active";

export function listForDay(day = isoDay()) {
  return Promotion.find({ day }).sort({ createdAt: 1 }).populate("product", PRODUCT_FIELDS).lean();
}

/** Precio promocional vigente hoy por producto. */
export async function todayPrices() {
  const promos = await Promotion.find({ day: isoDay() }, "product price").lean();
  return new Map(promos.map((p) => [String(p.product), p.price]));
}

export async function create(input: { product: string; day: string; price: number; title?: string }) {
  const p = await Product.findOne({ _id: input.product, active: true }, "salePrice").lean();
  if (!p) throw new HttpError(404, "Producto no encontrado o inactivo");
  if (input.price >= p.salePrice) throw new HttpError(400, "El precio de promoción debe ser menor al precio normal");
  try {
    return await Promotion.create(input);
  } catch (e) {
    if (isDuplicate(e)) throw new HttpError(409, "Ese producto ya tiene promoción ese día");
    throw e;
  }
}

export async function remove(id: string) {
  await Promotion.deleteOne({ _id: id });
}
