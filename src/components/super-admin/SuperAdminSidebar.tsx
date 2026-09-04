"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Banknote,
  LogOut,
  Shield,
  ChevronRight,
  Home,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/super-admin",
    icon: LayoutDashboard,
    exact: true,
    comingSoon: true,
  },
  {
    label: "Gestión de Admins",
    href: "/super-admin/admins",
    icon: Users,
    exact: false,
    comingSoon: false,
  },
  {
    label: "Abonos",
    href: "/super-admin/abonos",
    icon: Banknote,
    exact: false,
    comingSoon: false,
  },
  {
    label: "Planes",
    href: "/super-admin/planes",
    icon: CreditCard,
    exact: false,
    comingSoon: false,
  },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen border-r border-white/10 bg-surface/80 backdrop-blur-xl sticky top-0 h-screen">
        {/* Logo / Branding */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-400">Super Admin</p>
              <p className="text-sm font-bold text-white">PicaditoYa</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group relative ${
                  isActive
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/25 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : item.comingSoon
                    ? "text-white/30 cursor-not-allowed"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                onClick={(e) => item.comingSoon && e.preventDefault()}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-violet-400" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">
                    Pronto
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <Home className="w-4 h-4" />
            Volver al Home
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── TOPBAR MOBILE ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-surface/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-violet-400 block leading-tight">Super Admin</span>
            <span className="text-sm font-bold text-white block leading-tight">PicaditoYa</span>
          </div>
        </div>

        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        >
          {menuAbierto ? <X className="w-5 h-5 text-violet-400" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ── MOBILE DRAWER MODAL ── */}
      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in">
          {/* Backdrop oscuro con blur */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={cerrarMenu}
          />

          {/* Panel lateral deslizante */}
          <div className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#0b120e] border-l border-white/10 shadow-2xl flex flex-col z-10 animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm font-black text-white">Navegación</span>
              </div>
              <button
                onClick={cerrarMenu}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.comingSoon ? "#" : item.href}
                    onClick={(e) => {
                      if (item.comingSoon) {
                        e.preventDefault();
                      } else {
                        cerrarMenu();
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold"
                        : item.comingSoon
                        ? "text-white/30 cursor-not-allowed"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-violet-400" : ""}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">
                        Pronto
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-white/10 space-y-1 bg-white/[0.01]">
              <Link
                href="/"
                onClick={cerrarMenu}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <Home className="w-4 h-4" />
                Volver al Home
              </Link>
              <button
                onClick={() => {
                  cerrarMenu();
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
