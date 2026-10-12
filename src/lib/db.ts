import "server-only";
import mongoose from "mongoose";

const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

/** Una sola conexión reutilizada entre hot-reloads y peticiones. */
export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI en .env.local");
  g._mongo ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).catch((e) => {
    g._mongo = undefined;
    throw e;
  });
  return g._mongo;
}
