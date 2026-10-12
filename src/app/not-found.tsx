import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-display text-7xl text-teja">404</p>
        <p className="mt-2 text-tinta-2">Esta puerta no lleva a ninguna parte.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-tinta px-5 py-2.5 font-semibold text-cal">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
