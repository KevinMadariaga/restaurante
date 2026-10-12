import { model, models, Schema, Types, type InferSchemaType, type Model } from "mongoose";
import { CATEGORIES, ITEM_STATUSES, ORDER_STATUSES, PAY_METHODS } from "@/lib/constants";

const item = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  // Snapshot: si el producto cambia de precio después, la venta conserva el valor cobrado.
  name: { type: String, required: true },
  category: { type: String, enum: CATEGORIES, required: true },
  price: { type: Number, required: true },
  promo: { type: Boolean, default: false },
  cost: { type: Number, required: true, default: 0 },
  qty: { type: Number, required: true, min: 1 },
  note: { type: String, default: "" },
  status: { type: String, enum: ITEM_STATUSES, default: "pendiente" },
  round: { type: Number, default: 1 },
  addedAt: { type: Date, default: Date.now },
  addedByName: String,
  noteByName: String,
});

/** Cambios hechos por alguien distinto al mesero dueño del pedido (para avisarle). */
const change = new Schema({
  by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  byName: { type: String, required: true },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now },
});

const schema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    table: { type: Number, required: true },
    waiter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    waiterName: { type: String, required: true },
    items: { type: [item], default: [] },
    changes: { type: [change], default: [] },
    status: { type: String, enum: ORDER_STATUSES, default: "abierto" },
    /** Estado derivado de los ítems: el más atrasado manda. */
    stage: { type: String, enum: ITEM_STATUSES, default: "pendiente" },
    total: { type: Number, default: 0 },
    payment: {
      type: {
        method: { type: String, enum: PAY_METHODS },
        received: Number,
        change: Number,
        cashier: Schema.Types.ObjectId,
        cashierName: String,
      },
      default: undefined,
    },
    cashSession: { type: Schema.Types.ObjectId, ref: "CashSession" },
    paidAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
);
// Una mesa solo puede tener un pedido abierto.
schema.index({ table: 1 }, { unique: true, partialFilterExpression: { status: "abierto" } });
schema.index({ status: 1, paidAt: -1 });
schema.index({ cashSession: 1 });

schema.pre("save", function () {
  this.total = this.items.reduce((s, i) => s + i.price * i.qty, 0);
  const st = this.items.map((i) => i.status);
  this.stage = st.includes("pendiente") ? "pendiente" : st.includes("servido") ? "servido" : "entregado";
});

export type OrderDoc = InferSchemaType<typeof schema> & { _id: Types.ObjectId };
export const Order = (models.Order as Model<OrderDoc>) ?? model("Order", schema);
