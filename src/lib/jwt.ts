import { jwtVerify, SignJWT } from "jose";
import type { Role } from "./constants";

export const SESSION_COOKIE = "pp_session";
export const SESSION_MAX_AGE = 60 * 60 * 14; // un turno largo

export type Session = { sub: string; name: string; role: Role };

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error("JWT_SECRET falta o es muy corto");
  return new TextEncoder().encode(secret);
}

export function signSession(s: Session) {
  return new SignJWT({ name: s.name, role: s.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { sub: payload.sub!, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}
