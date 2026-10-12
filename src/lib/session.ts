import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./jwt";
import type { Role } from "./constants";
import { HttpError } from "./http";
import { User } from "@/models/User";

export async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Valida sesión y rol dentro de cada endpoint (nunca confiar solo en el proxy). */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const token = await getSession();
  if (!token) throw new HttpError(401, "Inicia sesión");
  // El token dura un turno: se confirma en BD para que desactivar o cambiar el rol aplique de inmediato.
  const u = await User.findById(token.sub, "name role active").lean();
  if (!u?.active) throw new HttpError(401, "Tu usuario fue desactivado");
  const s: Session = { sub: token.sub, name: u.name, role: u.role };
  if (roles.length && !roles.includes(s.role)) throw new HttpError(403, "No tienes permiso para esto");
  return s;
}
