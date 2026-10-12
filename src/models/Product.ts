import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { CATEGORIES } from "@/lib/constants";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, default: "" },
    salePrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    // La imagen vive aparte del listado (select:false) y se sirve por /api/products/[id]/image?v=imageV
    image: { type: new Schema({ data: Buffer, mime: String }, { _id: false }), select: false },
    imageV: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ category: 1, name: 1 });

export type ProductDoc = InferSchemaType<typeof schema>;
export const Product = (models.Product as Model<ProductDoc>) ?? model("Product", schema);
