"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, CircleDot, CalendarDays } from "lucide-react";

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
      label: "Dashboard",
      sublabel: "Métricas y Resumen",
      href: "/admin",
      icon: LayoutDashboard,
      delay: "0ms",
      // Diagonal superior derecha ↗
      positionClass: "translate-x-20 -translate-y-20 sm:translate-x-24 sm:-translate-y-20",
    },
    {
      label: "Canchas",
      sublabel: "Crear y Gestionar",
      href: "/admin/canchas",
      icon: CircleDot,
      delay: "50ms",
      // Hacia la derecha directo →
      positionClass: "translate-x-24 translate-y-0 sm:translate-x-28 sm:translate-y-0",
    },
    {
      label: "Turnos",
      sublabel: "Turnero y Agenda",
      href: "/admin/turnos",
      icon: CalendarDays,
      delay: "100ms",
      // Diagonal inferior derecha ↘
      positionClass: "translate-x-20 translate-y-20 sm:translate-x-24 sm:translate-y-20",
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

      {/* ── BOTÓN FLOTANTE LATERAL IZQUIERDO EN EL MEDIO ── */}
      <div
        ref={menuRef}
        className="fixed left-5 sm:left-7 top-1/2 -translate-y-1/2 z-50 select-none"
      >
        <div className="relative">
          
          {/* Botón Principal (3 líneas) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative z-50 group border ${
              isOpen
                ? "bg-brand text-surface border-brand rotate-90 scale-110 shadow-[0_0_25px_rgba(69,228,148,0.7)]"
                : "bg-[#0f1712]/90 backdrop-blur-xl border-white/20 text-white hover:border-brand/80 hover:bg-brand hover:text-surface hover:scale-110 hover:shadow-[0_0_20px_rgba(69,228,148,0.5)]"
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

          {/* Opciones Circulares Radiales desplegadas hacia la derecha */}
          {isOpen && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <div
                    key={item.href}
                    className={`absolute top-0 left-0 transition-all duration-300 ease-out pointer-events-auto ${
                      isOpen
                        ? `${item.positionClass} scale-100 opacity-100`
                        : "translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none"
                    }`}
                    style={{ transitionDelay: item.delay }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center gap-3 relative"
                    >
                      {/* Círculo individual de la opción */}
                      <div
                        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-all duration-200 shadow-2xl group-hover:scale-110 ${
                          isActive
                            ? "bg-brand text-surface border-brand shadow-[0_0_20px_rgba(69,228,148,0.6)] ring-4 ring-brand/20"
                            : "bg-[#0f1712]/95 backdrop-blur-xl hover:bg-brand/20 text-white hover:text-brand border-white/20 hover:border-brand/60"
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isActive ? "stroke-[2.5]" : ""}`} />
                      </div>

                      {/* Tooltip / Cartelito con el nombre */}
                      <div className="bg-[#0f1712]/95 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-2xl shadow-2xl whitespace-nowrap pointer-events-none transition-all group-hover:border-brand/50 group-hover:scale-105 group-hover:translate-x-1">
                        <p className={`text-xs font-black uppercase tracking-wider ${isActive ? "text-brand" : "text-white"}`}>
                          {item.label}
                        </p>
                        <p className="text-[10px] text-white/50">{item.sublabel}</p>
                      </div>
                    </Link>
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
