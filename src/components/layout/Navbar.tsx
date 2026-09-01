"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.rol;
  const esAdmin = ["admin", "empleado", "super_admin"].includes(userRole);

  return (
    <header className="absolute top-0 left-0 right-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-transparent border-b border-white/10">
      {/* Logo */}
      <Link 
        href="/" 
        className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-brand rounded-full outline-none"
      >
        <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(69,228,148,0.4)] group-hover:scale-105 transition-transform">
          <span className="text-surface font-black text-xl italic tracking-tighter">P</span>
        </div>
        <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm group-hover:text-white/90 transition-colors">
          Picadito<span className="text-brand">Ya</span>
        </span>
      </Link>

      {/* Navegación */}
      <nav className="flex items-center gap-4 md:gap-6">
        {status === "loading" ? (
          <div className="w-24 h-9 bg-white/5 rounded-full animate-pulse" />
        ) : session && esAdmin ? (
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 bg-brand/15 hover:bg-brand/25 text-brand border border-brand/30 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Panel Predio</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-white/60 hover:text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-white/5 transition-colors flex items-center gap-1.5"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              href="/registrar-cancha" 
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              Registrá tu cancha
            </Link>

            <Link
              href="/auth/login"
              className="text-xs font-medium text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5 border border-white/5"
            >
              Soy dueño
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
