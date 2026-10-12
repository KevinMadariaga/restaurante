import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { HOME } from "@/lib/constants";
import { body, HttpError, route } from "@/lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/jwt";
import { loginSchema } from "@/lib/validators";
import { User } from "@/models/User";

// ponytail: bloqueo en memoria por instancia; en Vercel cada instancia lleva su cuenta.
// Si hiciera falta un límite global, guardarlo en Mongo con índice TTL.
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;
const fails = new Map<string, { n: number; until: number }>();

export const POST = route(async (req) => {
  const { username, password } = loginSchema.parse(await body(req));
  const f = fails.get(username);
  if (f && f.until > Date.now()) throw new HttpError(429, "Demasiados intentos. Espera 5 minutos e intenta de nuevo");

  const user = await User.findOne({ username, active: true }).select("+passwordHash");
  // Mismo mensaje para usuario inexistente o clave errada: no revela qué usuarios existen.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const n = (f && f.until > 0 && f.until <= Date.now() ? 0 : (f?.n ?? 0)) + 1;
    fails.set(username, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    throw new HttpError(401, "Usuario o contraseña incorrectos");
  }
  fails.delete(username);

  const token = await signSession({ sub: String(user._id), name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return { name: user.name, role: user.role, home: HOME[user.role] };
});
