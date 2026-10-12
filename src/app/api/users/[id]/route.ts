import bcrypt from "bcryptjs";
import { body, HttpError, isDuplicate, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { userSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const PATCH = route(async (req, { params }) => {
  const me = await requireRole("admin");
  const { id } = await params;
  const { password, ...data } = userSchema.partial().parse(await body(req));
  if (id === me.sub && (data.active === false || (data.role && data.role !== "admin")))
    throw new HttpError(400, "No puedes desactivarte ni quitarte el rol de admin");
  const update = { ...data, ...(password && { passwordHash: await bcrypt.hash(password, 10) }) };
  try {
    const u = await User.findByIdAndUpdate(id, update, { runValidators: true });
    if (!u) throw new HttpError(404, "Usuario no encontrado");
  } catch (e) {
    if (isDuplicate(e)) throw new HttpError(409, "Ese usuario ya existe");
    throw e;
  }
  return { ok: true };
});
