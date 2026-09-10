"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CircleDot,
  CalendarDays,
  DollarSign,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  Building2,
  AlertCircle,
  Percent,
  Edit3,
  Check,
  Ban,
  X,
  MessageCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Eye,
  Phone,
  TrendingUp,
  BarChart3,
  Users,
  Flame,
  Award,
  FileSpreadsheet,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import PredioModal from "@/components/admin/PredioModal";
import BotonPushAdmin from "@/components/push/BotonPushAdmin";
import { exportarTurnosAExcel } from "@/lib/exportar-excel";

export type TurnoStatsItem = {
  id: string;
  fecha?: string | Date;
  horaInicio: string;
  horaFin: string;
  estado: string;
  precioAlMomentoReserva: number;
  esFijo?: boolean;
  grupoFijoId?: string | null;
  cancha: { nombre: string; deporte?: string };
  cliente?: { nombre: string; apellido?: string | null; telefono: string | null; email?: string | null } | null;
  nombreClienteManual?: string | null;
  telefonoClienteManual?: string | null;
};

export type AnalyticsData = {
  ingresosPorDia: { fecha: string; total: number }[];
  ingresosPorCancha: {
    semanal: { nombre: string; total: number }[];
    mensual: { nombre: string; total: number }[];
  };
  horariosMasVendidos: { hora: string; cantidad: number }[];
  clientesFrecuentes: { nombre: string; cantidad: number; ingresos: number }[];
  cancelacionesMes: number;
  confirmadosMes: number;
  tasaCancelacion: number;
};

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
  proximosTurnosHoy: TurnoStatsItem[];
  turnosPendientes?: TurnoStatsItem[];
  analytics?: AnalyticsData;
};

export default function AdminDashboardPage() {
  const { selectedPredio, selectedPredioId, predios, cargando: cargandoPredios } = useAdmin();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [cargandoStats, setCargandoStats] = useState(false);
  const [modalPredioOpen, setModalPredioOpen] = useState(false);
  const [modalPredioEditarOpen, setModalPredioEditarOpen] = useState(false);

  // Estados para filtros, acciones y detalles de turnos
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendientes" | "confirmados">("todos");
  const [periodoCancha, setPeriodoCancha] = useState<"semanal" | "mensual">("semanal");
  const [turnoDetalle, setTurnoDetalle] = useState<TurnoStatsItem | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

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

  // Cambiar estado de un turno (confirmar / denegar / cancelar)
  const handleActualizarEstado = async (turnoId: string, nuevoEstado: string) => {
    setProcesandoId(turnoId);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar estado del turno");
      }

      await fetchStats();
      if (turnoDetalle && turnoDetalle.id === turnoId) {
        setTurnoDetalle(null);
      }
    } catch (err: any) {
      alert(err.message || "Error al procesar el turno");
    } finally {
      setProcesandoId(null);
    }
  };

  // Marcar asistencia formal ("asistió" / "no-show") actualizando puntaje del cliente
  const handleMarcarAsistencia = async (turnoId: string, asistio: boolean) => {
    setProcesandoId(turnoId);
    try {
      const res = await fetch(`/api/turnos/${turnoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marcar_asistencia", asistio }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo registrar la asistencia");
      }

      await fetchStats();
      if (turnoDetalle && turnoDetalle.id === turnoId) {
        setTurnoDetalle(null);
      }
    } catch (err: any) {
      alert(err.message || "Error al registrar asistencia");
    } finally {
      setProcesandoId(null);
    }
  };

  // Eliminar y liberar turno
  const handleEliminarTurno = async (turnoId: string) => {
    if (!confirm("¿Estás seguro de que querés eliminar y liberar completamente este turno?")) return;
    setProcesandoId(turnoId);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar turno");
      }

      await fetchStats();
      if (turnoDetalle && turnoDetalle.id === turnoId) {
        setTurnoDetalle(null);
      }
    } catch (err: any) {
      alert(err.message || "Error al eliminar el turno");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleExportarExcelHoy = () => {
    if (!stats?.proximosTurnosHoy || stats.proximosTurnosHoy.length === 0) {
      alert("No hay turnos registrados hoy para exportar.");
      return;
    }
    exportarTurnosAExcel(
      stats.proximosTurnosHoy.map((t) => ({
        ...t,
        fecha: t.fecha ? String(t.fecha) : new Date().toISOString(),
      })),
      `Cierre_Diario_${selectedPredio?.nombre || "Predio"}`
    );
  };

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

  // Filtrar turnos de hoy según pestaña
  const turnosHoy = stats?.proximosTurnosHoy || [];
  const turnosFiltrados = turnosHoy.filter((t) => {
    if (filtroEstado === "pendientes") return t.estado === "pendiente";
    if (filtroEstado === "confirmados") return t.estado === "confirmado" || t.estado === "completado";
    return true;
  });

  const pendientesHoyCount = turnosHoy.filter((t) => t.estado === "pendiente").length;
  const confirmadosHoyCount = turnosHoy.filter((t) => t.estado === "confirmado" || t.estado === "completado").length;

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
            onClick={handleExportarExcelHoy}
            className="px-5 py-3 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            title="Exportar a Excel los turnos y caja de hoy"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Descargar Cierre Excel
          </button>

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

      {/* ── BANNER / CONTROL DE NOTIFICACIONES PUSH EN VIVO ── */}
      <BotonPushAdmin variante="card" />

      {/* ── ALERTA DE TURNOS PENDIENTES DE CONFIRMACIÓN ── */}
      {stats?.turnosPendientes && stats.turnosPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-[#0f1712] to-amber-500/10 border border-amber-500/40 p-6 sm:p-7 rounded-[2rem] shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                  Solicitudes Pendientes de Confirmación ({stats.turnosPendientes.length})
                </h2>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Los clientes solicitaron estos turnos y esperan tu confirmación. Aceptalos o denegalos directamente aquí:
                </p>
              </div>
            </div>
            <Link
              href="/admin/turnos"
              className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 self-start sm:self-auto shrink-0 transition-colors"
            >
              Ir al turnero visual <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {stats.turnosPendientes.map((t) => {
              const clienteNombre = t.cliente
                ? [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
                : t.nombreClienteManual || "Cliente sin nombre";
              const telefono = t.telefonoClienteManual || t.cliente?.telefono;
              const isProcesando = procesandoId === t.id;
              const fechaStr = t.fecha ? new Date(t.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "Hoy";

              return (
                <div
                  key={t.id}
                  className="bg-[#0f1712]/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg hover:border-amber-400/60 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-white px-2.5 py-1 rounded-xl bg-surface border border-white/10">
                        {t.horaInicio} - {t.horaFin}
                      </span>
                      <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {fechaStr}
                      </span>
                    </div>

                    <div className="pt-1">
                      <p className="text-sm font-bold text-white truncate">{clienteNombre}</p>
                      <p className="text-xs text-white/60">{t.cancha.nombre}</p>
                    </div>

                    {telefono && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-white/50 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-white/40" />
                          {telefono}
                        </span>
                        <a
                          href={`https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Hola ${clienteNombre}! Te escribimos respecto a tu solicitud de turno para ${t.cancha.nombre} (${t.horaInicio} a ${t.horaFin}).`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          title="Enviar mensaje de WhatsApp"
                        >
                          <MessageCircle className="w-2.5 h-2.5" />
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-brand">
                      ${t.precioAlMomentoReserva.toLocaleString("es-AR")}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleActualizarEstado(t.id, "confirmado")}
                        disabled={isProcesando}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-surface font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                        title="Aceptar y confirmar este turno"
                      >
                        {isProcesando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Aceptar
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`¿Denegar el turno solicitado por ${clienteNombre}?`)) {
                            handleActualizarEstado(t.id, "cancelado_tarde");
                          }
                        }}
                        disabled={isProcesando}
                        className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                        title="Denegar solicitud"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Denegar
                      </button>

                      <button
                        onClick={() => setTurnoDetalle(t)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                        title="Ver detalles completos"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

      {/* ── SECCIÓN DE ANALYTICS & RENDIMIENTO DE NEGOCIO ── */}
      {stats?.analytics && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-brand" />
                <span className="text-xs font-black uppercase tracking-widest text-brand">Rendimiento Operativo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">
                Métricas & Estadísticas del Negocio
              </h2>
            </div>
            <p className="text-xs text-white/50 max-w-xs">
              Datos analíticos actualizados para optimizar la ocupación, precios y retención de jugadores.
            </p>
          </div>

          {/* Grilla Superior de Analytics: Ingresos por Día & Ingresos por Cancha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Ingresos por día (Últimos 7 días) */}
            <div className="lg:col-span-7 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-7 rounded-[2rem] shadow-2xl flex flex-col justify-between space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Ingresos por Día</h3>
                    <p className="text-xs text-white/50">Evolución de los últimos 7 días</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
                  Total semana: $
                  {stats.analytics.ingresosPorDia.reduce((acc, d) => acc + d.total, 0).toLocaleString("es-AR")}
                </span>
              </div>

              {/* Gráfico de barras interactivo */}
              <div className="h-48 flex items-end justify-between gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-white/5">
                {(() => {
                  const maxDia = Math.max(...stats.analytics.ingresosPorDia.map((d) => d.total), 1);
                  const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

                  return stats.analytics.ingresosPorDia.map((dia, idx) => {
                    const altura = Math.max(8, Math.round((dia.total / maxDia) * 100));
                    const isHoy = idx === stats.analytics!.ingresosPorDia.length - 1;
                    const dateObj = new Date(`${dia.fecha}T12:00:00`);
                    const nombreDia = diasNombres[dateObj.getDay()];
                    const diaNum = dateObj.getDate();

                    return (
                      <div key={dia.fecha} className="flex-1 flex flex-col items-center h-full justify-end group">
                        {/* Tooltip / Valor sobre la barra */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 px-2 py-1 rounded-lg bg-surface border border-white/10 text-[10px] font-mono font-bold text-brand shadow-lg whitespace-nowrap pointer-events-none">
                          ${dia.total.toLocaleString("es-AR")}
                        </div>

                        {/* Barra */}
                        <div
                          style={{ height: `${altura}%` }}
                          className={`w-full max-w-[36px] rounded-t-xl transition-all duration-500 group-hover:scale-105 ${
                            isHoy
                              ? "bg-gradient-to-t from-brand to-emerald-300 shadow-[0_0_15px_rgba(69,228,148,0.4)]"
                              : dia.total > 0
                              ? "bg-gradient-to-t from-brand/60 to-brand hover:from-brand hover:to-emerald-300"
                              : "bg-white/5"
                          }`}
                        />

                        {/* Etiqueta del día */}
                        <span
                          className={`text-[11px] font-bold mt-2.5 uppercase tracking-wider ${
                            isHoy ? "text-brand" : "text-white/60"
                          }`}
                        >
                          {nombreDia} {diaNum}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 2. Ingresos por cancha (con selector Semanal / Mensual) */}
            <div className="lg:col-span-5 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-7 rounded-[2rem] shadow-2xl flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CircleDot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Ingresos por Cancha</h3>
                    <p className="text-xs text-white/50">
                      {periodoCancha === "semanal" ? "Últimos 7 días" : "Últimos 30 días"}
                    </p>
                  </div>
                </div>

                {/* Selector Semanal / Mensual */}
                <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPeriodoCancha("semanal")}
                    className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                      periodoCancha === "semanal"
                        ? "bg-brand text-surface shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodoCancha("mensual")}
                    className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                      periodoCancha === "mensual"
                        ? "bg-brand text-surface shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Mensual
                  </button>
                </div>
              </div>

              <div className="space-y-3.5 flex-1 justify-center flex flex-col">
                {(() => {
                  const rawData = stats.analytics.ingresosPorCancha;
                  const canchas = Array.isArray(rawData)
                    ? rawData
                    : rawData[periodoCancha] || [];

                  if (canchas.length === 0) {
                    return (
                      <p className="text-xs text-white/40 text-center py-6">
                        Aún no hay ingresos registrados por cancha para el período {periodoCancha}.
                      </p>
                    );
                  }

                  const totalCanchas = canchas.reduce((acc, c) => acc + c.total, 0) || 1;

                  return canchas.map((c, idx) => {
                    const porcentaje = Math.round((c.total / totalCanchas) * 100);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[170px]">{c.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-brand">${c.total.toLocaleString("es-AR")}</span>
                            <span className="text-[10px] font-mono text-white/40">({porcentaje}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            style={{ width: `${porcentaje}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-brand rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>

          {/* Grilla Inferior de Analytics: Horarios Más Vendidos, Clientes Frecuentes & Cancelaciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 3. Horarios más vendidos */}
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Horarios Más Vendidos</h3>
                  <p className="text-xs text-white/50">Turnos pico más demandados</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {stats.analytics.horariosMasVendidos.length > 0 ? (
                  stats.analytics.horariosMasVendidos.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                            idx === 0
                              ? "bg-amber-400 text-surface font-black shadow-sm"
                              : idx === 1
                              ? "bg-white/20 text-white font-bold"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-sm font-bold text-white">{h.hora} hs</span>
                      </div>
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        {h.cantidad} reservas
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 text-center py-6">Sin registros de reservas todavía.</p>
                )}
              </div>
            </div>

            {/* 4. Clientes frecuentes */}
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Clientes Frecuentes</h3>
                  <p className="text-xs text-white/50">Jugadores con más reservas</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {stats.analytics.clientesFrecuentes.length > 0 ? (
                  stats.analytics.clientesFrecuentes.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-black text-xs shrink-0">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{c.nombre}</p>
                          <p className="text-[10px] text-white/50">{c.cantidad} partidos jugados</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-brand shrink-0">
                        ${c.ingresos.toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 text-center py-6">No hay clientes con turnos confirmados aún.</p>
                )}
              </div>
            </div>

            {/* 5. Cancelaciones */}
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <Ban className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Cancelaciones</h3>
                      <p className="text-xs text-white/50">Últimos 30 días</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      stats.analytics.tasaCancelacion <= 10
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : stats.analytics.tasaCancelacion <= 20
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-red-500/10 text-red-300 border-red-500/30"
                    }`}
                  >
                    {stats.analytics.tasaCancelacion <= 10 ? "Tasa Saludable" : "A revisar"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">Cancelados</span>
                    <span className="text-2xl font-display font-black text-red-400 mt-1 block">
                      {stats.analytics.cancelacionesMes}
                    </span>
                    <span className="text-[10px] text-white/40">turnos caídos</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">Tasa de Cancelación</span>
                    <span className="text-2xl font-display font-black text-white mt-1 block">
                      {stats.analytics.tasaCancelacion}%
                    </span>
                    <span className="text-[10px] text-white/40">del total generado</span>
                  </div>
                </div>
              </div>

              {/* Barra de Proporción Confirmados vs Cancelados */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {stats.analytics.confirmadosMes} Completados
                  </span>
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    {stats.analytics.cancelacionesMes} Cancelados
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 flex overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (stats.analytics.confirmadosMes /
                            (stats.analytics.confirmadosMes + stats.analytics.cancelacionesMes || 1)) *
                            100
                        )
                      )}%`,
                    }}
                    className="h-full bg-emerald-500 rounded-l-full"
                  />
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (stats.analytics.cancelacionesMes /
                            (stats.analytics.confirmadosMes + stats.analytics.cancelacionesMes || 1)) *
                            100
                        )
                      )}%`,
                    }}
                    className="h-full bg-red-500 rounded-r-full"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── CRONOGRAMA DE HOY A ANCHO COMPLETO ── */}
      <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-brand" />
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide">Turnos Programados para Hoy</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Pestañas */}
            <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filtroEstado === "todos"
                    ? "bg-brand text-surface shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Todos ({turnosHoy.length})
              </button>
              <button
                onClick={() => setFiltroEstado("pendientes")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filtroEstado === "pendientes"
                    ? "bg-amber-400 text-surface shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Pendientes ({pendientesHoyCount})
              </button>
              <button
                onClick={() => setFiltroEstado("confirmados")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filtroEstado === "confirmados"
                    ? "bg-emerald-400 text-surface shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Confirmados ({confirmadosHoyCount})
              </button>
            </div>

            <Link
              href="/admin/turnos?vista=listado"
              className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 transition-colors group hidden md:flex shrink-0"
            >
              Explorar todos los turnos <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {turnosFiltrados.length > 0 ? (
          <div className="space-y-3">
            {turnosFiltrados.map((t) => {
              const cliente = t.cliente
                ? [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
                : t.nombreClienteManual || "Cliente sin nombre";
              const telefono = t.telefonoClienteManual || t.cliente?.telefono;
              const isPendiente = t.estado === "pendiente";
              const isConfirmado = t.estado === "confirmado" || t.estado === "completado";
              const isProcesando = procesandoId === t.id;

              return (
                <div
                  key={t.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand/40 transition-colors gap-4"
                >
                  {/* Info horario, cliente y cancha */}
                  <div className="flex items-center gap-3.5">
                    <div className="font-mono text-sm font-bold text-white px-3 py-2 rounded-xl bg-surface border border-white/10 shadow-inner shrink-0">
                      {t.horaInicio} - {t.horaFin}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{cliente}</p>
                        {telefono && (
                          <a
                            href={`https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${cliente}! Te escribimos de ${t.cancha.nombre} respecto a tu reserva de hoy (${t.horaInicio} - ${t.horaFin}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 hover:scale-110 transition-transform"
                            title={`WhatsApp: ${telefono}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-white/50">{t.cancha.nombre} {telefono ? `• Tel: ${telefono}` : ""}</p>
                    </div>
                  </div>

                  {/* Estado, precio y botones de acción */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t border-white/5 lg:border-t-0">
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

                    {/* Botones de acción directos */}
                    <div className="flex items-center gap-2">
                      {isPendiente ? (
                        <>
                          <button
                            onClick={() => handleActualizarEstado(t.id, "confirmado")}
                            disabled={isProcesando}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-surface font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                            title="Aceptar y confirmar turno"
                          >
                            {isProcesando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Aceptar
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`¿Denegar el turno de ${cliente}?`)) {
                                handleActualizarEstado(t.id, "cancelado_tarde");
                              }
                            }}
                            disabled={isProcesando}
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                            title="Denegar turno"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Denegar
                          </button>
                        </>
                      ) : t.estado === "confirmado" ? (
                        <>
                          <button
                            onClick={() => handleMarcarAsistencia(t.id, true)}
                            disabled={isProcesando}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-surface font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                            title="Marcar que el cliente asistió al turno"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Asistió
                          </button>

                          <button
                            onClick={() => handleMarcarAsistencia(t.id, false)}
                            disabled={isProcesando}
                            className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                            title="Marcar No-Show (cliente ausente)"
                          >
                            <X className="w-3.5 h-3.5" />
                            No-Show
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que querés cancelar el turno confirmado de ${cliente}?`)) {
                                handleActualizarEstado(t.id, "cancelado_tarde");
                              }
                            }}
                            disabled={isProcesando}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 border border-white/10 transition-colors"
                            title="Cancelar turno confirmado"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}

                      {/* Botón Ver Detalles */}
                      <button
                        onClick={() => setTurnoDetalle(t)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Ver detalles completos del turno"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detalles
                      </button>
                    </div>
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
            <p className="text-sm font-medium">
              {filtroEstado === "todos"
                ? "No hay turnos registrados para hoy."
                : `No hay turnos con estado "${filtroEstado}" para hoy.`}
            </p>
            <Link
              href="/admin/turnos"
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              + Agendar un turno en el turnero
            </Link>
          </div>
        )}
      </div>

      {/* ── MODAL: DETALLE COMPLETO DEL TURNO ── */}
      {turnoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    turnoDetalle.estado === "pendiente"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Detalle del Turno</h2>
                  <p className="text-xs text-white/60">
                    {turnoDetalle.cancha.nombre} • {turnoDetalle.horaInicio} a {turnoDetalle.horaFin}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTurnoDetalle(null)}
                className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Información del cliente */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Cliente / Titular:</span>
                  <span className="text-sm font-bold text-white">
                    {turnoDetalle.cliente
                      ? [turnoDetalle.cliente.nombre, turnoDetalle.cliente.apellido].filter(Boolean).join(" ")
                      : turnoDetalle.nombreClienteManual || "Sin especificar"}
                  </span>
                </div>

                {(turnoDetalle.telefonoClienteManual || turnoDetalle.cliente?.telefono) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Teléfono:</span>
                    <a
                      href={`tel:${turnoDetalle.telefonoClienteManual || turnoDetalle.cliente?.telefono}`}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      {turnoDetalle.telefonoClienteManual || turnoDetalle.cliente?.telefono}
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Monto:</span>
                  <span className="text-sm font-bold text-brand font-mono">
                    ${turnoDetalle.precioAlMomentoReserva.toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Estado actual:</span>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full capitalize ${
                      turnoDetalle.estado === "pendiente"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {turnoDetalle.estado}
                  </span>
                </div>

                {/* Botón WhatsApp si tiene teléfono */}
                {(turnoDetalle.telefonoClienteManual || turnoDetalle.cliente?.telefono) && (
                  <div className="pt-2 border-t border-white/5">
                    <a
                      href={`https://wa.me/${(turnoDetalle.telefonoClienteManual || turnoDetalle.cliente?.telefono || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${turnoDetalle.cliente ? [turnoDetalle.cliente.nombre, turnoDetalle.cliente.apellido].filter(Boolean).join(" ") : turnoDetalle.nombreClienteManual || ""}! Te escribimos de ${turnoDetalle.cancha.nombre} respecto a tu reserva de turno (${turnoDetalle.horaInicio} a ${turnoDetalle.horaFin}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar WhatsApp al cliente
                    </a>
                  </div>
                )}
              </div>

              {/* Botones de acción principales (Aceptar / Denegar / Cancelar) */}
              {turnoDetalle.estado === "pendiente" ? (
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                    Solicitud Pendiente de Confirmación:
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleActualizarEstado(turnoDetalle.id, "confirmado")}
                      disabled={!!procesandoId}
                      className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-surface font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                    >
                      <Check className="w-4 h-4" />
                      Aceptar Turno
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("¿Denegar esta solicitud de turno?")) {
                          handleActualizarEstado(turnoDetalle.id, "cancelado_tarde");
                        }
                      }}
                      disabled={!!procesandoId}
                      className="py-3 px-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Ban className="w-4 h-4" />
                      Denegar Turno
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (confirm("¿Estás seguro de que deseas cancelar este turno confirmado?")) {
                        handleActualizarEstado(turnoDetalle.id, "cancelado_tarde");
                      }
                    }}
                    disabled={!!procesandoId}
                    className="w-full py-2.5 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Ban className="w-4 h-4" />
                    Cancelar Turno
                  </button>
                </div>
              )}

              {/* Botón para liberar / eliminar turno */}
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleEliminarTurno(turnoDetalle.id)}
                  disabled={!!procesandoId}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Liberar y Borrar Turno
                </button>

                <button
                  type="button"
                  onClick={() => setTurnoDetalle(null)}
                  className="px-6 py-2 rounded-full border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
