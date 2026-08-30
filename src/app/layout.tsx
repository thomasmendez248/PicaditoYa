import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PicaditoYa — Reservá tu cancha online",
  description:
    "Encontrá y reservá canchas deportivas cerca tuyo. Disponibilidad en tiempo real, sin llamadas, sin complicaciones.",
  keywords: ["reservar cancha", "fútbol 5", "turnos deportivos", "picadito", "Argentina"],
  openGraph: {
    title: "PicaditoYa — Reservá tu cancha online",
    description: "Encontrá y reservá canchas deportivas cerca tuyo en segundos.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${bebas.variable}`}>
      <body className="antialiased bg-neutral-950 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
