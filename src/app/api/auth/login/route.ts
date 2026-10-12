import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { HOME } from "@/lib/constants";
import { body, HttpError, route } from "@/lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/jwt";
import { loginSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const POST = route(async (req) => {
  const { username, password } = loginSchema.parse(await body(req));
  const user = await User.findOne({ username, active: true }).select("+passwordHash");
  // Mismo mensaje para usuario inexistente o clave errada: no revela qué usuarios existen.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Usuario o contraseña incorrectos");

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
