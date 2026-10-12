"use client";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field } from "@/components/ui";
import { api } from "@/hooks/use-live";

export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(undefined);
    try {
      const r = await api<{ home: string }>("/api/auth/login", { body: { username: f.get("username"), password: f.get("password") } });
      router.replace(r.home);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 animate-rise [animation-delay:120ms]">
      <ErrorNote message={error} />
      <Field label="Usuario">
        <input name="username" required autoComplete="username" autoCapitalize="none" autoCorrect="off" className="input h-12" placeholder="ej. ana" />
      </Field>
      <Field label="Contraseña">
        <div className="relative">
          <input name="password" required type={show ? "text" : "password"} autoComplete="current-password" className="input h-12 pr-12" placeholder="••••" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-tinta-2"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading} icon={LogIn}>
        Ingresar
      </Button>
    </form>
  );
}
