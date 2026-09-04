"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MapPin,
  Building2,
  ChevronDown,
  Plus,
  LayoutDashboard,
  CalendarDays,
  CircleDot,
  LogOut,
  Sparkles,
  ExternalLink,
  Edit2,
  User,
} from "lucide-react";
import { useAdmin, PredioAdmin } from "./AdminContext";
import PredioModal from "./PredioModal";
import RadialNavMenu from "./RadialNavMenu";

export default function AdminHeader() {
  const pathname = usePathname();
  const { predios, selectedPredioId, selectedPredio, setSelectedPredioId, puedeCrearMas, maxPredios, cargando } = useAdmin();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalPredioOpen, setModalPredioOpen] = useState(false);
  const [predioAEditar, setPredioAEditar] = useState<PredioAdmin | null>(null);

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Canchas", href: "/admin/canchas", icon: CircleDot },
    { label: "Turnos", href: "/admin/turnos", icon: CalendarDays },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0f1712]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            
            {/* Logo & Marca (Estilo Landing) */}
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-brand rounded-full outline-none">
                <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(69,228,148,0.4)] group-hover:scale-105 transition-transform">
                  <span className="text-surface font-black text-xl italic tracking-tighter">P</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm leading-none">
                    Picadito<span className="text-brand">Ya</span>
                  </span>
                  <span className="text-[10px] text-brand font-black uppercase tracking-widest mt-1">Admin Panel</span>
                </div>
              </Link>

              {/* Selector de Predio Superior */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={cargando || predios.length === 0}
                  className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand/40 transition-all text-left shadow-sm group"
                >
                  <div className="w-7 h-7 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div className="flex flex-col max-w-[160px] sm:max-w-[220px]">
                    <span className="text-xs font-bold text-white truncate">
                      {selectedPredio?.nombre || (cargando ? "Cargando predios..." : "Sin predios")}
                    </span>
                    <span className="text-[10px] text-white/50 truncate">
                      {selectedPredio?.direccion || "Seleccionar predio"}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/50 group-hover:text-brand transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Predios */}
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute left-0 mt-2 w-80 rounded-[1.5rem] bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-3 z-50 animate-fade-in space-y-1">
                      <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Mis Predios ({predios.length}/{maxPredios})</span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                        {predios.map((p) => (
                          <div
                            key={p.id}
                            className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all group ${
                              selectedPredioId === p.id
                                ? "bg-brand/20 border border-brand/40 text-white shadow-sm"
                                : "hover:bg-white/5 text-white/70 hover:text-white border border-transparent"
                            }`}
                          >
                            <button
                              onClick={() => {
                                setSelectedPredioId(p.id);
                                setDropdownOpen(false);
                              }}
                              className="text-left flex-1 truncate pr-2"
                            >
                              <p className="text-xs font-bold text-white truncate">{p.nombre}</p>
                              <p className="text-[10px] text-white/50 truncate">{p.direccion}</p>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {p._count?.canchas !== undefined && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-brand border border-white/10">
                                  {p._count.canchas}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPredioAEditar(p);
                                  setDropdownOpen(false);
                                  setModalPredioOpen(true);
                                }}
                                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                title="Editar datos del predio"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        {puedeCrearMas ? (
                          <button
                            onClick={() => {
                              setPredioAEditar(null);
                              setDropdownOpen(false);
                              setModalPredioOpen(true);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-brand/15 hover:bg-brand/25 text-brand text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-brand/30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar otro predio
                          </button>
                        ) : (
                          <div className="px-3 py-2 text-center">
                            <span className="text-[11px] text-white/60 flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> Plan actual: {maxPredios} de {maxPredios} predios
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Acciones derecha */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin/perfil"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:border-brand/40 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all"
                title="Editar mis datos personales"
              >
                <User className="w-3.5 h-3.5 text-brand" />
                <span className="hidden sm:inline">Mi Perfil</span>
              </Link>

              <Link
                href="/"
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all"
                title="Ver web pública"
              >
                <span>Ver web</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-red-400 transition-all"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Menú de Navegación Lateral Izquierdo Flotante en el Medio (Speed-Dial) */}
      <RadialNavMenu />

      {/* Modal para crear o editar predio */}
      <PredioModal
        isOpen={modalPredioOpen}
        onClose={() => setModalPredioOpen(false)}
        predio={predioAEditar}
      />
    </>
  );
}
