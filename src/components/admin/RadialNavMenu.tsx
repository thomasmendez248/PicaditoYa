"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { X, LayoutDashboard, CircleDot, CalendarDays, LogOut, User } from "lucide-react";

export default function RadialNavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar con la tecla ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      sublabel: "Métricas",
      href: "/admin",
      icon: LayoutDashboard,
      delay: "0ms",
      mobile: { x: -100, y: -50 },
      desktop: { x: 76, y: -93 },
    },
    {
      id: "canchas",
      label: "Canchas",
      sublabel: "Gestión",
      href: "/admin/canchas",
      icon: CircleDot,
      delay: "30ms",
      mobile: { x: -55, y: -95 },
      desktop: { x: 115, y: -45 },
    },
    {
      id: "turnos",
      label: "Turnos",
      sublabel: "Agenda",
      href: "/admin/turnos",
      icon: CalendarDays,
      delay: "60ms",
      mobile: { x: 0, y: -110 },
      desktop: { x: 125, y: 10 },
    },
    {
      id: "perfil",
      label: "Mi Perfil",
      sublabel: "Mis Datos",
      href: "/admin/perfil",
      icon: User,
      delay: "90ms",
      mobile: { x: 55, y: -95 },
      desktop: { x: 105, y: 65 },
    },
    {
      id: "logout",
      label: "Salir",
      sublabel: "Cerrar Sesión",
      href: "#logout",
      isLogout: true,
      icon: LogOut,
      delay: "120ms",
      mobile: { x: 100, y: -50 },
      desktop: { x: 65, y: 110 },
    },
  ];

  return (
    <>
      {/* Backdrop con blur cuando el menú está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── BOTÓN FLOTANTE: INFERIOR CENTRO EN MOBILE | LATERAL IZQUIERDO EN DESKTOP ── */}
      <div
        ref={menuRef}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-7 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 z-50 select-none"
      >
        <div className="relative">
          
          {/* Botón Principal */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-50 group border ${
              isOpen
                ? "bg-brand text-surface border-brand rotate-90 scale-110 shadow-[0_0_25px_rgba(69,228,148,0.7)]"
                : "bg-[#0f1712]/95 backdrop-blur-xl border-white/20 text-white hover:border-brand/80 hover:bg-brand hover:text-surface hover:scale-110 hover:shadow-[0_0_20px_rgba(69,228,148,0.5)]"
            }`}
            aria-label="Abrir menú de navegación"
            title="Menú de secciones"
          >
            {isOpen ? (
              <X className="w-6 h-6 stroke-[2.5] transition-transform duration-300" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <span className="w-6 h-0.5 bg-current rounded-full transition-all group-hover:w-6" />
                <span className="w-4 h-0.5 bg-current rounded-full transition-all group-hover:w-6" />
                <span className="w-6 h-0.5 bg-current rounded-full transition-all group-hover:w-6" />
              </div>
            )}
          </button>

          {/* Opciones Circulares Radiales (4 Botones Centrados y Simétricos) */}
          {isOpen && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isLogout = item.isLogout;

                const innerContent = (
                  <>
                    {/* Círculo individual de la opción */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shadow-2xl group-hover:scale-110 shrink-0 ${
                        isActive
                          ? "bg-brand text-surface border-brand shadow-[0_0_20px_rgba(69,228,148,0.6)] ring-4 ring-brand/20"
                          : isLogout
                          ? "bg-[#0f1712]/95 backdrop-blur-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 border-white/20 hover:border-red-500/50"
                          : "bg-[#0f1712]/95 backdrop-blur-xl hover:bg-brand/20 text-white hover:text-brand border-white/20 hover:border-brand/60"
                      }`}
                    >
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                    </div>

                    {/* Tooltip / Cartelito con el nombre */}
                    <div
                      className={`bg-[#0f1712]/95 backdrop-blur-xl border px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-2xl whitespace-nowrap pointer-events-none transition-all group-hover:scale-105 ${
                        isLogout
                          ? "border-white/15 group-hover:border-red-500/50"
                          : "border-white/15 group-hover:border-brand/50"
                      }`}
                    >
                      <p
                        className={`text-[10px] sm:text-xs font-black uppercase tracking-wider text-center sm:text-left ${
                          isActive
                            ? "text-brand"
                            : isLogout
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/50 hidden sm:block">{item.sublabel}</p>
                    </div>
                  </>
                );

                return (
                  <div
                    key={item.id}
                    style={{
                      transitionDelay: item.delay,
                      ["--mob-x" as any]: `${item.mobile.x}px`,
                      ["--mob-y" as any]: `${item.mobile.y}px`,
                      ["--desk-x" as any]: `${item.desktop.x}px`,
                      ["--desk-y" as any]: `${item.desktop.y}px`,
                    }}
                    className={`absolute top-0 left-0 transition-all duration-300 ease-out pointer-events-auto ${
                      isOpen
                        ? "scale-100 opacity-100 [transform:translate(var(--mob-x),var(--mob-y))_translate(-50%,-50%)] sm:[transform:translate(var(--desk-x),var(--desk-y))_translate(-50%,-50%)]"
                        : "scale-0 opacity-0 pointer-events-none [transform:translate(0,0)_translate(-50%,-50%)]"
                    }`}
                  >
                    {isLogout ? (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          signOut({ callbackUrl: "/auth/login" });
                        }}
                        className="group flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 relative"
                      >
                        {innerContent}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="group flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 relative"
                      >
                        {innerContent}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
