import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./jwt";
import type { Role } from "./constants";
import { HttpError } from "./http";

export async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Valida sesión y rol dentro de cada endpoint (nunca confiar solo en el proxy). */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Inicia sesión");
  if (roles.length && !roles.includes(s.role)) throw new HttpError(403, "No tienes permiso para esto");
  return s;
}
