import { TZ } from "./constants";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const money = (n: number) => cop.format(n || 0);

const time = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: TZ });
export const hour = (d: string | Date) => time.format(new Date(d));

const dateFmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: TZ });
export const shortDate = (d: string | Date) => dateFmt.format(new Date(d));

const dtFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
export const dateTime = (d: string | Date) => dtFmt.format(new Date(d));

export function ago(d: string | Date) {
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h ${min % 60} min`;
}

/** YYYY-MM-DD en hora de Colombia. */
export function isoDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
