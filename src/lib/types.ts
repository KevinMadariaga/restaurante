// Formas que viajan por la API (documentos lean serializados).
import type { Category, ItemStatus, OrderStatus, PayMethod, Role } from "./constants";

export type Product = {
  _id: string;
  name: string;
  category: Category;
  description: string;
  salePrice: number;
  costPrice?: number;
  stock: number;
  active: boolean;
  imageV: number;
};

export type OrderItem = {
  _id: string;
  product: string;
  name: string;
  category: Category;
  price: number;
  promo?: boolean;
  qty: number;
  note: string;
  status: ItemStatus;
  round: number;
  addedAt: string;
};

export type Order = {
  _id: string;
  number: number;
  table: number;
  waiter: string;
  waiterName: string;
  items: OrderItem[];
  status: OrderStatus;
  stage: ItemStatus;
  total: number;
  payment?: { method: PayMethod; received: number; change: number; cashierName: string };
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = { _id: string; name: string; username: string; role: Role; active: boolean };

export type CashTotals = { efectivo: number; tarjeta: number; transferencia: number; orders: number };

export type CashSession = {
  _id: string;
  status: "abierta" | "cerrada";
  openingAmount: number;
  openedAt: string;
  openedByName: string;
  closedAt?: string;
  closedByName?: string;
  countedAmount?: number;
  expectedCash?: number;
  difference?: number;
  note?: string;
  totals: CashTotals;
};

export type Report = {
  totals: { sales: number; orders: number; avgTicket: number; cost?: number; profit?: number };
  byDay: { date: string; total: number; orders: number }[];
  byMethod: { method: PayMethod; total: number; orders: number }[];
  byCategory: { category: Category; total: number; qty: number }[];
  products: { name: string; category: Category; qty: number; total: number; profit?: number }[];
  orders: Order[];
};

export type Promotion = {
  _id: string;
  day: string;
  price: number;
  title: string;
  product: Product;
};
