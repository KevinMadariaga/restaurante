import type { Metadata } from "next";
import { Logo } from "@/components/shell";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Fachada */}
      <section className="relative hidden overflow-hidden bg-teja text-white lg:flex lg:flex-col">
        <div className="tejado h-4 brightness-75" />
        <div className="flex flex-1 flex-col justify-end p-14">
          <p className="text-sm font-semibold tracking-[0.3em] text-white/70 uppercase animate-rise">Restaurante · Desde el corazón de Antioquia</p>
          <h1 className="mt-4 font-display text-[clamp(4rem,7vw,7.5rem)] leading-[0.88] animate-rise [animation-delay:80ms]">
            Pueblito
            <br />
            <span className="text-maiz">Paisa</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/80 animate-rise [animation-delay:160ms]">
            Mesas, cocina y caja conectadas. Cada pedido llega a donde tiene que llegar, sin papelitos.
          </p>
        </div>
        {/* Puertas y ventanas */}
        <div className="flex h-44 items-end gap-5 px-14">
          {["bg-balcon", "bg-puerta", "bg-maiz", "bg-rosa", "bg-balcon"].map((c, i) => (
            <div
              key={i}
              style={{ animationDelay: `${240 + i * 70}ms` }}
              className={`${c} w-full animate-rise rounded-t-[999px] border-4 border-white/90 ${i % 2 ? "h-36" : "h-28"}`}
            />
          ))}
        </div>
        <div className="zocalo h-6" />
      </section>

      {/* Formulario */}
      <section className="relative flex flex-col">
        <div className="zocalo h-1.5 lg:hidden" />
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 animate-rise lg:hidden">
              <Logo className="size-12" />
              <p className="font-display text-3xl leading-none">
                Pueblito <span className="text-teja">Paisa</span>
              </p>
            </div>
            <h2 className="mt-10 font-display text-4xl animate-rise lg:mt-0">Bienvenido</h2>
            <p className="mt-2 text-tinta-2 animate-rise [animation-delay:60ms]">Ingresa con tu usuario para empezar el turno.</p>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
