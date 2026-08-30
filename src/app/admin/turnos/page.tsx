"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  CircleDot,
  Calendar as CalendarIcon,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import TurneroVisual from "@/components/admin/TurneroVisual";
import CanchaModal, { CanchaData } from "@/components/admin/CanchaModal";
import { format } from "date-fns";

export default function AdminTurnosPage() {
  const { selectedPredio, selectedPredioId } = useAdmin();
  const [canchas, setCanchas] = useState<CanchaData[]>([]);
  const [canchaSeleccionadaId, setCanchaSeleccionadaId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalCanchaOpen, setModalCanchaOpen] = useState(false);

  const fetchCanchas = useCallback(async () => {
    if (!selectedPredioId) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/canchas?predioId=${selectedPredioId}`);
      if (!res.ok) throw new Error("Error al obtener las canchas");
      const data = await res.json();
      setCanchas(data.canchas || []);

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
      
      {/* ── HEADER DE SECCIÓN & FILTROS SUPERIORES ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-brand">
              {selectedPredio?.nombre || "Predio"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-wide uppercase drop-shadow-md">
            Gestión de Turnos
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-1">
            Turnero visual interactivo por cancha y fecha
          </p>
        </div>

        {/* SELECT BOX DE CANCHA + SELECTOR DE FECHA */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Select Box Canchas */}
          <div className="relative min-w-[220px]">
            <CircleDot className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
            <select
              value={canchaSeleccionadaId || ""}
              onChange={(e) => setCanchaSeleccionadaId(e.target.value)}
              disabled={canchas.length === 0}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-8 py-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white cursor-pointer hover:bg-white/10 transition-colors"
            >
              {canchas.length === 0 ? (
                <option value="" className="text-black">Sin canchas</option>
              ) : (
                canchas.map((c) => (
                  <option key={c.id} value={c.id} className="text-black">
                    {c.nombre} (${c.precioTurno.toLocaleString("es-AR")})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selector de Fecha */}
          <div className="relative">
            <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
            />
          </div>

        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── CUERPO DEL TURNERO ── */}
      {cargando ? (
        <div className="h-64 flex items-center justify-center bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-xs font-semibold text-white/60">Cargando canchas y turnos...</span>
          </div>
        </div>
      ) : canchas.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-2xl font-display font-black text-white uppercase tracking-wide mb-2">No hay canchas disponibles para agendar turnos</h3>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-8">
            Primero creá al menos una cancha en este predio para visualizar su turnero.
          </p>
          {selectedPredioId && (
            <button
              onClick={() => setModalCanchaOpen(true)}
              className="bg-brand hover:bg-brand-hover text-surface font-black px-8 py-3.5 rounded-full text-sm inline-flex items-center gap-2 shadow-[0_0_15px_rgba(69,228,148,0.3)] transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Crear Cancha
            </button>
          )}
        </div>
      ) : canchaActiva ? (
        <div className="animate-fade-in">
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
            fecha={fecha}
          />
        </div>
      ) : null}

      {/* Modal para crear cancha si no hay */}
      {selectedPredioId && (
        <CanchaModal
          isOpen={modalCanchaOpen}
          onClose={() => setModalCanchaOpen(false)}
          predioId={selectedPredioId}
          onSuccess={fetchCanchas}
        />
      )}

    </div>
  );
}
