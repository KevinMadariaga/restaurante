# Pueblito Paisa · Sistema del restaurante

Pedidos, caja, inventario y ventas con tres roles conectados: **Mesero**, **Cajero** y **Admin**.
Next.js 16 (App Router) · MongoDB (Mongoose 9) · Tailwind v4 · Motion · Zod · JWT (jose).

## Puesta en marcha
```bash
cp .env.example .env.local   # MONGODB_URI (local o Atlas) y JWT_SECRET
npm install
npm run seed                 # usuarios y productos de ejemplo (--reset para empezar de cero)
npm run dev                  # http://localhost:3000
```
Sin MongoDB local: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`, o crea un clúster gratis en MongoDB Atlas y pega su URI.
Celular en la misma red: `npm run dev -- -H 0.0.0.0` y abre `http://IP-del-PC:3000`.

### Usuarios demo (contraseña `1234`)
| Usuario | Rol | Entra a |
|---|---|---|
| `admin` | Admin | todo |
| `caja` | Cajero | Pedidos, Caja, Ventas, Carta |
| `andres`, `luisa` | Mesero | Mesas, Carta |

## Flujo
```
MESERO toma pedido ─► CAJA: alerta grande "Pedido para la mesa X" ─► "Marcar servido"
      ▲                                                                  │
      │                                   MESERO: alerta "Pedido listo" ◄┘
      │                                   "Pedido entregado"
      └─ adición / quitar productos ─────► CAJA: "Por cobrar" ─► Cobrar
                                           (efectivo: ¿con cuánto paga? → vueltos) ─► Pagado ─► Ventas
```
- El estado vive por producto (`pendiente → servido → entregado`); el del pedido se deriva. Las adiciones vuelven a avisar a caja sin afectar lo ya entregado.
- Una mesa = un pedido abierto (índice único). Stock se descuenta de forma atómica al pedir y vuelve si se quita algo aún no preparado.
- No se cobra sin **caja abierta** ni con productos sin entregar. El cierre compara efectivo contado vs. esperado (base + ventas en efectivo).
- Mesas: el admin agrega o quita mesas desde **Mesas** (botones − / +). No se puede quitar una mesa con pedido abierto.
- Usuarios: solo el admin los crea en **Usuarios** y asigna el rol (Mesero, Cajero o Admin).
- Ventas: hoy, ayer, mes, mes pasado o rango; por día, forma de pago, categoría, producto y detalle de cada pedido. Costos y ganancia solo para admin.

## Estructura
```
src/
  proxy.ts            protección de rutas por rol (lee ACCESS en lib/constants)
  lib/                constants, db, jwt, session, http (wrapper de rutas), validators (zod), format, types
  models/             User, Product, Order, CashSession, Counter
  services/           orders, cash, reports  ← lógica de negocio, sin HTTP
  app/api/            route handlers delgados: validan rol + zod y llaman a services
  app/(app)/          mesas, pedidos, caja, ventas, productos, catalogo, usuarios
  components/         ui (botón, hoja, segmentado…), shell, alerts, orders-context
scripts/seed.ts
```
Tiempo real por polling cada 3 s (pausado si la pestaña no está visible), compartido en un solo contexto. Funciona en cualquier hosting, incluido Vercel.
Imágenes: se reducen en el navegador (≤720px webp) y se guardan en Mongo, servidas en `/api/products/[id]/image` con caché inmutable.
