export const ROLES = ["mesero", "cajero", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  mesero: "Mesero",
  cajero: "Cajero",
  admin: "Administrador",
};

export const CATEGORIES = ["platillos", "bebidas", "mecatos", "helados"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  platillos: "Platillos",
  bebidas: "Bebidas",
  mecatos: "Mecatos",
  helados: "Helados",
};

export const ITEM_STATUSES = ["pendiente", "servido", "entregado"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ORDER_STATUSES = ["abierto", "pagado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAY_METHODS = ["efectivo", "tarjeta", "transferencia"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export const PAY_LABEL: Record<PayMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

/** Mesas iniciales; luego el admin las cambia desde la app (colección settings). */
export const DEFAULT_TABLES = 12;
export const MAX_TABLES = 200;

// Colombia no usa horario de verano: offset fijo.
export const TZ = "America/Bogota";
export const TZ_OFFSET = "-05:00";

export const LOW_STOCK = 5;

/** Los platillos se preparan al momento: no llevan control de inventario. */
export const tracksStock = (c: Category) => c !== "platillos";

/** Unidades que se pueden pedir de un producto (sin límite práctico para platillos). */
export const available = (p: { category: Category; stock: number }) => (tracksStock(p.category) ? p.stock : 99);

/** Página de inicio y rutas permitidas por rol. El proxy y la navegación leen de aquí. */
export const HOME: Record<Role, string> = {
  mesero: "/mesas",
  cajero: "/pedidos",
  admin: "/ventas",
};

export const ACCESS: Record<string, readonly Role[]> = {
  "/mesas": ["mesero", "admin"],
  "/pedidos": ["cajero", "admin"],
  "/caja": ["cajero", "admin"],
  "/ventas": ["cajero", "admin"],
  "/catalogo": ["mesero", "cajero", "admin"],
  "/productos": ["admin"],
  "/promociones": ["admin"],
  "/usuarios": ["admin"],
};

export function canAccess(pathname: string, role: Role) {
  const base = "/" + (pathname.split("/")[1] ?? "");
  const allowed = ACCESS[base];
  return !allowed || allowed.includes(role);
}
