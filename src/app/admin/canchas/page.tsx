"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CircleDot,
  Plus,
  Edit2,
  CalendarDays,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import CanchaModal, { CanchaData } from "@/components/admin/CanchaModal";
import TurneroVisual from "@/components/admin/TurneroVisual";
import { format } from "date-fns";

export default function AdminCanchasPage() {
  const { selectedPredio, selectedPredioId } = useAdmin();
  const [canchas, setCanchas] = useState<CanchaData[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancha seleccionada para detalle/gestión rápida
  const [canchaSeleccionadaId, setCanchaSeleccionadaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"turnos" | "detalles">("turnos");
  const [fechaTurnero, setFechaTurnero] = useState(format(new Date(), "yyyy-MM-dd"));

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [canchaAEditar, setCanchaAEditar] = useState<CanchaData | null>(null);

  const fetchCanchas = useCallback(async () => {
    if (!selectedPredioId) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/canchas?predioId=${selectedPredioId}`);
      if (!res.ok) throw new Error("Error al obtener las canchas");
      const data = await res.json();
      setCanchas(data.canchas || []);

      // Auto-seleccionar primera cancha si no hay ninguna seleccionada
      if (data.canchas && data.canchas.length > 0) {
        setCanchaSeleccionadaId((prev) => {
          const exists = data.canchas.some((c: CanchaData) => c.id === prev);
          return exists ? prev : data.canchas[0].id;
        });
      } else {
        setCanchaSeleccionadaId(null);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar canchas");
    } finally {
      setCargando(false);
    }
  }, [selectedPredioId]);

  useEffect(() => {
    fetchCanchas();
  }, [fetchCanchas]);

  const canchaActiva = canchas.find((c) => c.id === canchaSeleccionadaId) || null;

  return (
    <div className="space-y-8">
      
      {/* ── HEADER DE SECCIÓN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-brand">
              {selectedPredio?.nombre || "Predio"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-wide uppercase drop-shadow-md">
            Gestión de Canchas
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-1">
            Administrá los precios, capacidades, horarios y turnos de cada cancha
          </p>
        </div>

        {selectedPredioId && (
          <button
            onClick={() => {
              setCanchaAEditar(null);
              setModalOpen(true);
            }}
            className="bg-brand hover:bg-brand-hover text-surface font-black px-7 py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(69,228,148,0.3)] hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva Cancha
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── LISTADO DE CANCHAS (Cards) ── */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-[#0f1712]/60 border border-white/10 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : canchas.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <CircleDot className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-2xl font-display font-black text-white uppercase tracking-wide mb-2">No hay canchas registradas en este predio</h3>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-8">
            Creá tu primera cancha definiendo el precio de alquiler, horario y capacidad.
          </p>
          {selectedPredioId && (
            <button
              onClick={() => {
                setCanchaAEditar(null);
                setModalOpen(true);
              }}
              className="bg-brand hover:bg-brand-hover text-surface font-black px-8 py-3.5 rounded-full text-sm inline-flex items-center gap-2 shadow-[0_0_15px_rgba(69,228,148,0.3)] transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Crear Cancha
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {canchas.map((c) => {
            const isSelected = c.id === canchaSeleccionadaId;

            return (
              <div
                key={c.id}
                onClick={() => setCanchaSeleccionadaId(c.id!)}
                className={`p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-brand/10 border-brand shadow-[0_0_25px_rgba(69,228,148,0.2)]"
                    : "bg-[#0f1712]/80 backdrop-blur-xl border-white/10 hover:border-brand/40 hover:bg-[#0f1712] shadow-xl hover:shadow-[0_0_20px_rgba(69,228,148,0.1)]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform ${isSelected ? "bg-brand text-surface shadow-sm" : "bg-white/5 text-brand border border-white/10"}`}>
                        <CircleDot className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-white text-lg truncate">{c.nombre}</h3>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCanchaAEditar(c);
                        setModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all"
                      title="Editar cancha"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-brand" /> Precio Turno:
                      </span>
                      <span className="font-bold text-brand font-mono text-base">
                        ${c.precioTurno.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-white/40" /> Capacidad:
                      </span>
                      <span className="font-semibold text-white">{c.capacidad} jugadores</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-white/40" /> Horario:
                      </span>
                      <span className="font-mono text-white">
                        {c.horarioApertura} - {c.horarioCierre}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-brand flex items-center gap-1.5" : "text-white/50"}`}>
                    {isSelected ? "● Cancha activa" : "Click para ver turnero"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCanchaSeleccionadaId(c.id!);
                      setActiveTab("turnos");
                    }}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Ver Turnero
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── APARTADO DE GESTIÓN / TURNERO DE LA CANCHA SELECCIONADA ── */}
      {canchaActiva && (
        <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl space-y-6 animate-fade-in">
          
          {/* Header del apartado seleccionado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-brand shadow-[0_0_10px_rgba(69,228,148,0.8)]" />
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">{canchaActiva.nombre}</h2>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                ${canchaActiva.precioTurno.toLocaleString("es-AR")} / turno • {canchaActiva.horarioApertura} a {canchaActiva.horarioCierre} • {canchaActiva.capacidad} jugadores
              </p>
            </div>

            {/* Selector de fecha para el turnero */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="date"
                  value={fechaTurnero}
                  onChange={(e) => setFechaTurnero(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
                />
              </div>

              <button
                onClick={() => {
                  setCanchaAEditar(canchaActiva);
                  setModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-all hover:border-brand/40"
              >
                <Edit2 className="w-3.5 h-3.5 text-brand" />
                Modificar Cancha
              </button>
            </div>
          </div>

          {/* Turnero Visual de la Cancha */}
          <div>
            <TurneroVisual
              cancha={{
                id: canchaActiva.id!,
                nombre: canchaActiva.nombre,
                precioTurno: canchaActiva.precioTurno,
                duracionTurnoMinutos: canchaActiva.duracionTurnoMinutos,
                horarioApertura: canchaActiva.horarioApertura,
                horarioCierre: canchaActiva.horarioCierre,
                diasOperativos: canchaActiva.diasOperativos,
              }}
              fecha={fechaTurnero}
            />
          </div>
        </div>
      )}

      {/* Modal de Crear / Modificar Cancha */}
      {selectedPredioId && (
        <CanchaModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          cancha={canchaAEditar}
          predioId={selectedPredioId}
          onSuccess={fetchCanchas}
        />
      )}

    </div>
  );
}
