"use client";
import { CheckCircle2, Printer } from "lucide-react";
import { createPortal } from "react-dom";
import { PAY_LABEL, type PayMethod } from "@/lib/constants";
import { dateTime, money } from "@/lib/format";
import type { Order } from "@/lib/types";
import { Button, Sheet } from "./ui";

export type ReceiptData = {
  order: Pick<Order, "number" | "table" | "waiterName" | "items" | "total">;
  method: PayMethod;
  received: number;
  change: number;
  paidAt: string;
  cashierName: string;
};

/** Tiquete en formato de impresora térmica (80 mm). Solo visible al imprimir (ver .print-area en globals.css). */
function Ticket({ r }: { r: ReceiptData }) {
  const line = "border-t border-dashed border-black my-1.5";
  return (
    <div className="print-area font-mono text-[12px] leading-snug text-black">
      <p className="text-center text-[15px] font-bold">PUEBLITO PAISA</p>
      <p className="text-center">Restaurante</p>
      <div className={line} />
      <p>Fecha: {dateTime(r.paidAt)}</p>
      <p>
        Pedido #{r.order.number} · Mesa {r.order.table}
      </p>
      <p>Mesero: {r.order.waiterName}</p>
      <p>Cajero: {r.cashierName}</p>
      <div className={line} />
      {r.order.items.map((i) => (
        <div key={i._id} className="flex gap-1">
          <span className="w-6 shrink-0">{i.qty}</span>
          <span className="flex-1">
            {i.name}
            {i.promo && " (promo)"}
          </span>
          <span>{money(i.price * i.qty)}</span>
        </div>
      ))}
      <div className={line} />
      <div className="flex justify-between text-[15px] font-bold">
        <span>TOTAL</span>
        <span>{money(r.order.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Pago</span>
        <span>{PAY_LABEL[r.method]}</span>
      </div>
      {r.method === "efectivo" && (
        <>
          <div className="flex justify-between">
            <span>Recibido</span>
            <span>{money(r.received)}</span>
          </div>
          <div className="flex justify-between">
            <span>Vueltos</span>
            <span>{money(r.change)}</span>
          </div>
        </>
      )}
      <div className={line} />
      <p className="text-center">¡Gracias por su visita!</p>
    </div>
  );
}

/** Monta el tiquete fuera del árbol de la app y abre el diálogo de impresión. */
export function PrintableTicket({ r }: { r: ReceiptData }) {
  return createPortal(<Ticket r={r} />, document.body);
}

/** Después de cobrar: confirma el pago y pregunta si se imprime el tiquete. */
export function ReceiptSheet({ data, onClose }: { data?: ReceiptData; onClose: () => void }) {
  return (
    <>
      <Sheet
        open={!!data}
        onClose={onClose}
        title="Pago registrado"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" variant="outline" onClick={onClose}>
              No imprimir
            </Button>
            <Button
              size="lg"
              icon={Printer}
              onClick={() => {
                // Algunos navegadores móviles imprimen de forma asíncrona: cerrar al terminar.
                window.addEventListener("afterprint", onClose, { once: true });
                window.print();
              }}
            >
              Imprimir ticket
            </Button>
          </div>
        }
      >
        {data && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-14 text-balcon" strokeWidth={1.6} />
            <p className="mt-2 text-tinta-2">
              Mesa {data.order.table} · Pedido #{data.order.number} · {PAY_LABEL[data.method]}
            </p>
            <p className="font-display text-4xl tabular">{money(data.order.total)}</p>
            {data.method === "efectivo" && data.change > 0 && (
              <div className="mt-4 rounded-2xl bg-balcon px-4 py-4 text-white">
                <p className="text-sm font-semibold opacity-80">Entrega de vueltos</p>
                <p className="font-display text-4xl tabular">{money(data.change)}</p>
              </div>
            )}
            <p className="mt-5 font-semibold">¿El cliente quiere el ticket impreso?</p>
          </div>
        )}
      </Sheet>
      {data && <PrintableTicket r={data} />}
    </>
  );
}
