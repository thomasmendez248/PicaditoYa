import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
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

export const viewport: Viewport = {
  themeColor: "#45e494",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "PicaditoYa — Reservá tu cancha online",
  description:
    "Encontrá y reservá canchas de fútbol, pádel, tenis, básquet y vóley en tiempo real en toda Argentina.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PicaditoYa",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.svg",
  },
  keywords: ["reservar cancha", "fútbol", "pádel", "tenis", "básquet", "vóley", "turnos deportivos", "picadito", "Argentina"],
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
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

