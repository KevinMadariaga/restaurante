import type { Metadata, Viewport } from "next";
import { Figtree, Gloock } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Pueblito Paisa",
  description: "Pedidos, caja y ventas del restaurante Pueblito Paisa",
  appleWebApp: { capable: true, title: "Pueblito Paisa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#fbf6ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
