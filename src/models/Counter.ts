import { model, models, Schema, type Model } from "mongoose";

const schema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = (models.Counter as Model<{ _id: string; seq: number }>) ?? model("Counter", schema);

export async function nextSeq(name: string) {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return c.seq;
}
