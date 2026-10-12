import { z } from "zod";
import { CATEGORIES, PAY_METHODS, MAX_TABLES, ROLES } from "./constants";

const id = z.string().regex(/^[a-f0-9]{24}$/, "Identificador inválido");
const money = z.coerce.number().int("Usa valores sin decimales").min(0, "El valor no puede ser negativo").max(100_000_000);

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Escribe tu usuario"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Usuario: 3-30 letras, números, punto o guion"),
  role: z.enum(ROLES),
  password: z.string().min(4, "La contraseña debe tener mínimo 4 caracteres").max(72).optional(),
  active: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  category: z.enum(CATEGORIES, "Elige una categoría"),
  description: z.string().trim().max(300).optional(),
  salePrice: money.refine((n) => n > 0, "El precio de venta debe ser mayor a 0"),
  costPrice: money,
  stock: z.coerce.number().int().min(0, "La cantidad no puede ser negativa").max(100_000),
  active: z.boolean().optional(),
  /** data URL (image/webp|jpeg|png) ya reducida en el navegador; null la elimina. */
  image: z
    .string()
    .regex(/^data:image\/(webp|jpeg|png);base64,/, "Imagen inválida")
    .max(1_500_000, "La imagen es muy pesada")
    .nullable()
    .optional(),
});

export const orderItemsSchema = z
  .array(
    z.object({
      product: id,
      qty: z.coerce.number().int().min(1).max(99),
      note: z.string().trim().max(120).default(""),
    }),
  )
  .min(1, "Agrega al menos un producto")
  .max(60);

export const createOrderSchema = z.object({
  table: z.coerce.number().int().min(1).max(MAX_TABLES, "Mesa inexistente"),
  items: orderItemsSchema,
});

export const orderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("serve") }),
  z.object({ action: z.literal("deliver") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("remove"), itemId: id }),
  z.object({ action: z.literal("add"), items: orderItemsSchema }),
  z.object({ action: z.literal("pay"), method: z.enum(PAY_METHODS), received: money.optional() }),
]);

export const cashSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), amount: money }),
  z.object({ action: z.literal("close"), counted: money, note: z.string().trim().max(200).default("") }),
]);

export const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const tablesSchema = z.object({
  count: z.coerce.number().int().min(1, "Debe haber al menos 1 mesa").max(MAX_TABLES, `Máximo ${MAX_TABLES} mesas`),
});

export const promotionSchema = z.object({
  product: id,
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  price: money.refine((n) => n > 0, "El precio de promoción debe ser mayor a 0"),
  title: z.string().trim().max(80).optional(),
});
