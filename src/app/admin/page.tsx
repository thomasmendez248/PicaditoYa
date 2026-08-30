"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CircleDot,
  CalendarDays,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  Building2,
  AlertCircle,
  Percent,
  Edit3,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import PredioModal from "@/components/admin/PredioModal";

type StatsData = {
  predio: {
    id: string;
    nombre: string;
    direccion: string;
  };
  totalCanchas: number;
  turnosHoyTotal: number;
  turnosConfirmadosHoy: number;
  turnosPendientesHoy: number;
  ingresosHoy: number;
  ingresosMes: number;
  ocupacionHoyPorcentaje: number;
  proximosTurnosHoy: Array<{
    id: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
    precioAlMomentoReserva: number;
    cancha: { nombre: string };
    cliente?: { nombre: string; telefono: string | null } | null;
    nombreClienteManual?: string | null;
  }>;
};

export default function AdminDashboardPage() {
  const { selectedPredio, selectedPredioId, predios, cargando: cargandoPredios } = useAdmin();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [cargandoStats, setCargandoStats] = useState(false);
  const [modalPredioOpen, setModalPredioOpen] = useState(false);
  const [modalPredioEditarOpen, setModalPredioEditarOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!selectedPredioId) {
      setStats(null);
      return;
    }

    setCargandoStats(true);
    try {
      const res = await fetch(`/api/admin/stats?predioId=${selectedPredioId}`);
      if (!res.ok) throw new Error("Error al obtener estadísticas");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoStats(false);
    }
  }, [selectedPredioId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Si no tiene predios cargados
  if (!cargandoPredios && predios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 sm:p-12 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[2.5rem] animate-fade-in max-w-2xl mx-auto mt-8">
        <div className="w-20 h-20 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(69,228,148,0.2)]">
          <Building2 className="w-10 h-10 text-brand" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-wide mb-3">
          ¡Bienvenido al Panel de Administración!
        </h2>
        <p className="text-white/70 text-base max-w-md mb-8">
          Para comenzar a gestionar canchas y turnos, primero registrá tu primer complejo deportivo o predio.
        </p>
        <button
          onClick={() => setModalPredioOpen(true)}
          className="bg-brand hover:bg-brand-hover text-surface font-black px-8 py-3.5 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(69,228,148,0.4)] transition-all hover:scale-105 text-sm"
        >
          <Plus className="w-5 h-5" />
          Crear mi primer predio
        </button>
        <PredioModal isOpen={modalPredioOpen} onClose={() => setModalPredioOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* ── HEADER DEL PREDIO ACTIVO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-brand">Complejo Seleccionado</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-wide uppercase drop-shadow-md">
            {selectedPredio?.nombre || "Cargando predio..."}
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-1 flex items-center gap-1.5">
            {selectedPredio?.direccion || "Seleccioná un predio para ver sus métricas"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setModalPredioEditarOpen(true)}
            className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm flex items-center gap-2 transition-all hover:border-brand/40"
            title="Editar nombre, dirección y ubicación"
          >
            <Edit3 className="w-4 h-4 text-brand" />
            Editar Predio
          </button>
        </div>
      </div>

      {/* Modal para editar predio actual */}
      {selectedPredio && (
        <PredioModal
          isOpen={modalPredioEditarOpen}
          onClose={() => setModalPredioEditarOpen(false)}
          predio={selectedPredio}
        />
      )}

      {/* ── KPIs / ESTADÍSTICAS ── */}
      {cargandoStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-[#0f1712]/60 border border-white/10 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card: Canchas Activas */}
          <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 hover:border-brand/40 p-6 rounded-[2rem] shadow-xl group transition-all duration-300 hover:shadow-[0_0_20px_rgba(69,228,148,0.12)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Total Canchas</span>
              <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-sm">
                <CircleDot className="w-5 h-5 text-brand" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-display font-black text-white tracking-wider">{stats?.totalCanchas || 0}</span>
              <p className="text-xs text-white/50 mt-1">Canchas en este complejo</p>
            </div>
          </div>

          {/* Card: Turnos de Hoy */}
          <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 p-6 rounded-[2rem] shadow-xl group transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Turnos Hoy</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-display font-black text-white tracking-wider">{stats?.turnosHoyTotal || 0}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-emerald-400">
                  {stats?.turnosConfirmadosHoy || 0} confirmados
                </span>
                {stats?.turnosPendientesHoy ? (
                  <span className="text-[11px] font-bold text-amber-400">
                    • {stats.turnosPendientesHoy} pendientes
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Card: Ocupación Hoy */}
          <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 hover:border-blue-500/40 p-6 rounded-[2rem] shadow-xl group transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Ocupación Hoy</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-sm">
                <Percent className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-display font-black text-white tracking-wider">{stats?.ocupacionHoyPorcentaje || 0}%</span>
              <p className="text-xs text-white/50 mt-1">De la capacidad estimada</p>
            </div>
          </div>

          {/* Card: Ingresos del Mes */}
          <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 p-6 rounded-[2rem] shadow-xl group transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Ingresos Mes</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-sm">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-display font-black text-white tracking-wider">
                ${(stats?.ingresosMes || 0).toLocaleString("es-AR")}
              </span>
              <p className="text-xs text-white/50 mt-1">
                Hoy: ${(stats?.ingresosHoy || 0).toLocaleString("es-AR")}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── CRONOGRAMA DE HOY A ANCHO COMPLETO ── */}
      <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-brand" />
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide">Turnos Programados para Hoy</h2>
          </div>
          <Link
            href="/admin/turnos"
            className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 transition-colors group"
          >
            Ver grilla completa <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {stats?.proximosTurnosHoy && stats.proximosTurnosHoy.length > 0 ? (
          <div className="space-y-3">
            {stats.proximosTurnosHoy.map((t) => {
              const cliente = t.nombreClienteManual || t.cliente?.nombre || "Cliente sin nombre";
              const isPendiente = t.estado === "pendiente";

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="font-mono text-sm font-bold text-white px-3 py-1.5 rounded-xl bg-surface border border-white/10 shadow-inner">
                      {t.horaInicio} - {t.horaFin}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{cliente}</p>
                      <p className="text-xs text-white/50">{t.cancha.nombre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-brand">
                      ${t.precioAlMomentoReserva.toLocaleString("es-AR")}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                        isPendiente
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {t.estado}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center text-white/60 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <CalendarDays className="w-7 h-7 text-white/40" />
            </div>
            <p className="text-sm font-medium">No hay turnos registrados para hoy.</p>
            <Link
              href="/admin/turnos"
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              + Agendar un turno en el turnero
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
