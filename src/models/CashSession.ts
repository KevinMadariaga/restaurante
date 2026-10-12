import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    status: { type: String, enum: ["abierta", "cerrada"], default: "abierta" },
    openingAmount: { type: Number, required: true, min: 0 },
    openedAt: { type: Date, default: Date.now },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openedByName: { type: String, required: true },
    closedAt: Date,
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedByName: String,
    countedAmount: Number,
    expectedCash: Number,
    difference: Number,
    note: String,
    totals: {
      efectivo: { type: Number, default: 0 },
      tarjeta: { type: Number, default: 0 },
      transferencia: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);
// Solo una caja abierta a la vez.
schema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: "abierta" } });

export type CashSessionDoc = InferSchemaType<typeof schema>;
export const CashSession = (models.CashSession as Model<CashSessionDoc>) ?? model("CashSession", schema);
