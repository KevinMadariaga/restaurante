import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Promoción del día: un producto a precio especial en una fecha (YYYY-MM-DD, hora Colombia). */
const schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    price: { type: Number, required: true, min: 0 },
    title: { type: String, default: "" },
  },
  { timestamps: true },
);
schema.index({ day: 1, product: 1 }, { unique: true });

export type PromotionDoc = InferSchemaType<typeof schema>;
export const Promotion = (models.Promotion as Model<PromotionDoc>) ?? model("Promotion", schema);
