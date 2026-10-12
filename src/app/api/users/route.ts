import bcrypt from "bcryptjs";
import { body, HttpError, isDuplicate, route } from "@/lib/http";
import { requireRole } from "@/lib/session";
import { userSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const GET = route(async () => {
  await requireRole("admin");
  return User.find().sort({ role: 1, name: 1 }).lean();
});

export const POST = route(async (req) => {
  await requireRole("admin");
  const { password, ...data } = userSchema.parse(await body(req));
  if (!password) throw new HttpError(400, "La contraseña es obligatoria");
  try {
    const u = await User.create({ ...data, passwordHash: await bcrypt.hash(password, 10) });
    return { _id: u._id };
  } catch (e) {
    if (isDuplicate(e)) throw new HttpError(409, "Ese usuario ya existe");
    throw e;
  }
});
