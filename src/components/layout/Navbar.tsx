"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, User, CalendarDays, ChevronDown, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.rol;
  const esAdmin = ["admin", "empleado", "super_admin"].includes(userRole);
  const esCliente = userRole === "cliente";

  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú si se hace click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-transparent border-b border-white/10">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-brand rounded-full outline-none"
      >
        <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(76,175,125,0.4)] group-hover:scale-105 transition-transform">
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
          /* ── Admin / Empleado / SuperAdmin ── */
          <div className="flex items-center gap-3">
            {userRole === "super_admin" ? (
              <Link
                href="/super-admin"
                className="flex items-center gap-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </Link>
            ) : (
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-brand/15 hover:bg-brand/25 text-brand border border-brand/30 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Panel Predio</span>
              </Link>
            )}

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
        ) : session && esCliente ? (
          /* ── Cliente logueado ── */
          <div className="flex items-center gap-3" ref={menuRef}>
            {/* Dropdown del usuario */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-brand" />
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {(session.user as any)?.name ?? session.user?.email}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${menuAbierto ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown menu */}
              {menuAbierto && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f1712]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-1.5 animate-fade-in">
                  <Link
                    href="/cliente/mis-turnos"
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <CalendarDays className="w-4 h-4 text-brand" />
                    Mis turnos
                  </Link>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => { setMenuAbierto(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── No logueado ── */
          <div className="flex items-center gap-4">
            <Link
              href="/registrar-cancha"
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              Registrá tu cancha
            </Link>

            <Link
              href="/auth/login"
              className="text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 transition-all px-4 py-2 rounded-full flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Iniciar Sesión
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
