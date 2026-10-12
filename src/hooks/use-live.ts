"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** fetch JSON con manejo de errores de la API ({ error }) y sesión vencida. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && !url.includes("/auth/")) {
    location.href = "/login";
    throw new Error("Sesión vencida");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Algo salió mal, intenta de nuevo");
  return data as T;
}

/**
 * Datos "en vivo" por polling: refresca cada `ms` mientras la pestaña está visible
 * y al volver a ella. ponytail: polling simple; cambiar a SSE/WebSocket si hay decenas de terminales.
 */
export function useLive<T>(url: string | null, ms = 3000) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const urlRef = useRef(url);
  urlRef.current = url;

  const reload = useCallback(async () => {
    const u = urlRef.current;
    if (!u) return;
    try {
      const d = await api<T>(u);
      if (urlRef.current === u) {
        setData(d);
        setError(undefined);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!url) return;
    reload();
    if (!ms) return;
    const id = setInterval(() => !document.hidden && reload(), ms);
    const onVis = () => !document.hidden && reload();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, ms, reload]);

  return { data, error, loading: !data && !error, reload };
}
