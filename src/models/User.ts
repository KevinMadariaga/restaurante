import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@/lib/constants";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof schema>;
export const User = (models.User as Model<UserDoc>) ?? model("User", schema);
