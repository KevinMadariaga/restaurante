import "server-only";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { connectDB } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Ctx = { params: Promise<Record<string, string>> };

/** Envuelve un Route Handler: conecta a BD, serializa a JSON y traduce errores. */
export function route(fn: (req: Request, ctx: Ctx) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      await connectDB();
      const out = await fn(req, ctx);
      return out instanceof Response ? out : Response.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return Response.json({ error: e.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
      if (e instanceof mongoose.Error.CastError) return Response.json({ error: "Identificador inválido" }, { status: 400 });
      if (e instanceof mongoose.Error.VersionError)
        return Response.json({ error: "Otro usuario modificó este pedido, intenta de nuevo" }, { status: 409 });
      console.error(e);
      return Response.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

export async function body(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Cuerpo JSON inválido");
  }
}

export function isDuplicate(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}
