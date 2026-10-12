/**
 * Datos de ejemplo. Uso: npm run seed          (solo si la BD está vacía)
 *                        npm run seed -- --reset (borra todo y vuelve a sembrar)
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { CashSession } from "../src/models/CashSession";
import { Counter } from "../src/models/Counter";
import { Order } from "../src/models/Order";
import { Product } from "../src/models/Product";
import { Promotion } from "../src/models/Promotion";
import { Setting } from "../src/models/Setting";
import { User } from "../src/models/User";

const products = [
  ["Bandeja paisa", "platillos", "Frijoles, arroz, chicharrón, carne molida, huevo, maduro, aguacate y arepa", 32000, 15000, 30],
  ["Sancocho trifásico", "platillos", "Res, cerdo y pollo con yuca, papa y mazorca", 28000, 12000, 20],
  ["Mondongo antioqueño", "platillos", "Con arroz, aguacate y arepa", 24000, 10000, 15],
  ["Chicharrón con arepa", "platillos", "Chicharrón tostado y arepa de maíz blanco", 18000, 7500, 25],
  ["Frijolada", "platillos", "Frijoles con garra, arroz, maduro y hogao", 22000, 9000, 20],
  ["Limonada de coco", "bebidas", "", 9000, 3000, 40],
  ["Jugo de mora en agua", "bebidas", "", 6000, 2000, 50],
  ["Aguapanela con limón", "bebidas", "", 4000, 1000, 60],
  ["Cerveza Club Colombia", "bebidas", "Botella 330 ml", 7000, 3500, 48],
  ["Gaseosa personal", "bebidas", "", 4500, 2200, 48],
  ["Tinto", "bebidas", "Café de la casa", 2000, 500, 100],
  ["Buñuelo", "mecatos", "", 2500, 900, 40],
  ["Pandebono", "mecatos", "", 2500, 900, 40],
  ["Empanada de pipián", "mecatos", "Con ají de la casa", 3000, 1100, 60],
  ["Obleas con arequipe", "mecatos", "", 5000, 1800, 25],
  ["Paleta de mora", "helados", "", 4000, 1500, 30],
  ["Cono de vainilla", "helados", "", 5000, 1800, 30],
  ["Salpicón con helado", "helados", "Frutas picadas, jugo de sandía y helado de vainilla", 9000, 3500, 20],
] as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI (.env.local)");
  await mongoose.connect(uri);

  if (process.argv.includes("--reset")) {
    await Promise.all([User, Product, Order, CashSession, Counter, Setting, Promotion].map((m) => (m as mongoose.Model<unknown>).deleteMany({})));
    console.log("Base de datos limpia");
  } else if (await User.exists({})) {
    console.log("Ya hay datos. Usa `npm run seed -- --reset` para empezar de cero.");
    return;
  }
  await Promise.all([User, Product, Order, CashSession].map((m) => (m as mongoose.Model<unknown>).syncIndexes()));

  const hash = await bcrypt.hash("1234", 10);
  await User.insertMany([
    { name: "Administrador", username: "admin", role: "admin", passwordHash: hash },
    { name: "Carolina (caja)", username: "caja", role: "cajero", passwordHash: hash },
    { name: "Andrés", username: "andres", role: "mesero", passwordHash: hash },
    { name: "Luisa", username: "luisa", role: "mesero", passwordHash: hash },
  ]);
  await Product.insertMany(
    products.map(([name, category, description, salePrice, costPrice, stock]) => ({ name, category, description, salePrice, costPrice, stock })),
  );
  console.log(`Listo: 4 usuarios (contraseña 1234) y ${products.length} productos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
