"use client";
import { motion } from "motion/react";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, cn, Empty, ErrorNote, Field, PageHeader, Segmented, Sheet, Skeleton } from "@/components/ui";
import { api, useLive } from "@/hooks/use-live";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/constants";
import type { User } from "@/lib/types";

const ROLE_TONE: Record<Role, string> = { admin: "bg-tinta text-cal", cajero: "bg-balcon/12 text-balcon", mesero: "bg-puerta/12 text-puerta" };

export default function UsuariosPage() {
  const { data, error, reload } = useLive<User[]>("/api/users", 0);
  const [editing, setEditing] = useState<User | "new">();
  const [seq, setSeq] = useState(0);
  const edit = (u: User | "new") => (setEditing(u), setSeq((n) => n + 1));

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Meseros, cajeros y administradores."
        action={
          <Button icon={Plus} onClick={() => edit("new")}>
            Nuevo usuario
          </Button>
        }
      />
      <ErrorNote message={error} />
      {!data ? (
        <Skeleton className="h-60" />
      ) : data.length === 0 ? (
        <Empty icon={Users} title="Sin usuarios" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((u, i) => (
            <motion.button
              key={u._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => edit(u)}
              className={cn("card flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]", !u.active && "opacity-50")}
            >
              <span className="grid size-12 place-items-center rounded-full bg-cal-2 font-display text-xl">{u.name[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{u.name}</span>
                <span className="block text-sm text-tinta-2">
                  @{u.username}
                  {!u.active && " · inactivo"}
                </span>
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", ROLE_TONE[u.role])}>{ROLE_LABEL[u.role]}</span>
            </motion.button>
          ))}
        </div>
      )}
      <UserForm key={seq} user={editing} onClose={() => setEditing(undefined)} onSaved={reload} />
    </>
  );
}

function UserForm({ user, onClose, onSaved }: { user?: User | "new"; onClose: () => void; onSaved: () => void }) {
  const existing = user && user !== "new" ? user : undefined;
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    username: existing?.username ?? "",
    role: (existing?.role ?? "mesero") as Role,
    password: "",
    active: existing?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const payload = { ...form, password: form.password || undefined };
    try {
      if (existing) await api(`/api/users/${existing._id}`, { method: "PATCH", body: payload });
      else await api("/api/users", { body: payload });
      toast.success(existing ? "Usuario actualizado" : "Usuario creado");
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={existing ? "Editar usuario" : "Nuevo usuario"}
      footer={
        <Button form="user-form" type="submit" size="lg" className="w-full" loading={busy}>
          Guardar
        </Button>
      }
    >
      <form id="user-form" onSubmit={save} className="space-y-4">
        <ErrorNote message={error} />
        <Field label="Nombre">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Ana Gómez" />
        </Field>
        <Field label="Usuario">
          <input
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            autoCapitalize="none"
            autoCorrect="off"
            className="input"
            placeholder="ana"
          />
        </Field>
        <div>
          <span className="label">Rol</span>
          <div className="mt-1.5">
            <Segmented id="user-role" value={form.role} onChange={(role) => setForm({ ...form, role })} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          </div>
        </div>
        <Field label={existing ? "Nueva contraseña (opcional)" : "Contraseña"}>
          <input
            type="password"
            required={!existing}
            minLength={4}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            className="input"
            placeholder="Mínimo 4 caracteres"
          />
        </Field>
        <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
          <span className="font-semibold">Usuario activo</span>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="peer sr-only" />
          <span className="relative h-7 w-12 rounded-full bg-cal-3 transition-colors peer-checked:bg-balcon after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-5" />
        </label>
      </form>
    </Sheet>
  );
}
