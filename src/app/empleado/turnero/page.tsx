"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  MessageCircle,
  Phone,
  User,
  ShieldAlert,
  Star,
  Users,
  Loader2,
  Check,
  X,
  AlertCircle,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFechaHoyArgentina, getHoraActualArgentina } from "@/lib/date-utils";
import { getBadgeDeporte, getDeporteInfo } from "@/lib/sports";

interface TurnoEmpleado {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: "pendiente" | "confirmado" | "cancelado_a_tiempo" | "cancelado_tarde" | "completado" | "no_show";
  precioAlMomentoReserva: number;
  nombreClienteManual?: string | null;
  telefonoClienteManual?: string | null;
  cancha: {
    id: string;
    nombre: string;
    deporte?: string;
    capacidad: number;
    precioTurno: number;
    duracionTurnoMinutos: number;
  };
  cliente?: {
    id: string;
    nombre: string;
    apellido?: string | null;
    email: string;
    telefono?: string | null;
    image?: string | null;
    puntajeAsistencia?: number | null;
    turnosAsistidos?: number;
    turnosNoShow?: number;
  } | null;
}

interface PredioInfo {
  id: string;
  nombre: string;
  direccion: string;
}

function limpiarTelefono(tel: string | null | undefined): string {
  if (!tel) return "";
  const nums = tel.replace(/\D/g, "");
  if (nums.startsWith("549") || nums.startsWith("54")) return nums;
  if (nums.startsWith("15")) return `549${nums.slice(2)}`;
  return `549${nums}`;
}

export default function EmpleadoTurneroPage() {
  const hoyStr = getFechaHoyArgentina();

  const [fecha, setFecha] = useState<string>(hoyStr);
  const [horaActual, setHoraActual] = useState<string>(getHoraActualArgentina());
  const [turnos, setTurnos] = useState<TurnoEmpleado[]>([]);
  const [predio, setPredio] = useState<PredioInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "confirmados" | "completados" | "no_show">("todos");

  // Procesamiento
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraActual(getHoraActualArgentina());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Cargar turnos del día
  const fetchTurnos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/empleado/turnos?fecha=${fecha}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cargar turnos del predio");
      }
      const data = await res.json();
      setTurnos(data.turnos || []);
      setPredio(data.predio || null);
    } catch (err: any) {
      setError(err.message || "Error de conexión al cargar turnos");
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // Marcar Asistencia (Asistió / No-Show)
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

      const nuevoEstado = asistio ? "completado" : "no_show";

      // Actualizar listado local de inmediato
      setTurnos((prev) =>
        prev.map((t) => (t.id === turnoId ? { ...t, estado: nuevoEstado } : t))
      );
    } catch (err: any) {
      alert(err.message || "Error al registrar la asistencia");
    } finally {
      setProcesandoId(null);
    }
  };

  // Métricas rápidas
  const metricas = useMemo(() => {
    const total = turnos.length;
    const confirmados = turnos.filter((t) => t.estado === "confirmado").length;
    const completados = turnos.filter((t) => t.estado === "completado").length;
    const noShows = turnos.filter((t) => t.estado === "no_show").length;
    return { total, confirmados, completados, noShows };
  }, [turnos]);

  // Filtrado de turnos
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      // Filtro de estado
      if (filtroEstado === "confirmados" && t.estado !== "confirmado") return false;
      if (filtroEstado === "completados" && t.estado !== "completado") return false;
      if (filtroEstado === "no_show" && t.estado !== "no_show") return false;

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const clienteNom = (
          t.cliente
            ? `${t.cliente.nombre} ${t.cliente.apellido || ""}`
            : t.nombreClienteManual || ""
        ).toLowerCase();
        const canchaNom = t.cancha.nombre.toLowerCase();
        const tel = (t.cliente?.telefono || t.telefonoClienteManual || "").toLowerCase();

        return clienteNom.includes(q) || canchaNom.includes(q) || tel.includes(q);
      }

      return true;
    });
  }, [turnos, filtroEstado, busqueda]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Cabecera del Turnero */}
      <div className="bg-[#0f1712]/95 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black uppercase tracking-widest text-brand">
              {predio?.nombre || "Recepción"}
            </span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5" />
              Hora actual: {horaActual} hs
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-wide">
            Turnero de Canchas
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Recepción y control de asistencia de jugadores en el predio
          </p>
        </div>

        {/* Selector de Fecha y Refrescar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-2xl">
            <CalendarIcon className="w-4 h-4 text-brand shrink-0" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none [color-scheme:dark] cursor-pointer"
            />
          </div>

          <button
            onClick={fetchTurnos}
            disabled={cargando}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-brand" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Asistencia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f1712]/80 border border-white/10 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Total Turnos</span>
            <span className="text-2xl sm:text-3xl font-display font-black text-white mt-1 block font-mono">
              {metricas.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f1712]/80 border border-white/10 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider block">Por Llegar</span>
            <span className="text-2xl sm:text-3xl font-display font-black text-amber-300 mt-1 block font-mono">
              {metricas.confirmados}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f1712]/80 border border-white/10 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider block">Asistieron</span>
            <span className="text-2xl sm:text-3xl font-display font-black text-emerald-400 mt-1 block font-mono">
              {metricas.completados}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0f1712]/80 border border-white/10 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-400/90 uppercase tracking-wider block">No-Shows</span>
            <span className="text-2xl sm:text-3xl font-display font-black text-rose-400 mt-1 block font-mono">
              {metricas.noShows}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#0f1712]/90 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Búsqueda */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por jugador, teléfono o cancha..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-brand"
          />
        </div>

        {/* Pestañas de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "todos", label: `Todos (${metricas.total})` },
            { id: "confirmados", label: `Por Llegar (${metricas.confirmados})` },
            { id: "completados", label: `Asistieron (${metricas.completados})` },
            { id: "no_show", label: `No-Shows (${metricas.noShows})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filtroEstado === tab.id
                  ? "bg-brand text-surface shadow-[0_0_12px_rgba(69,228,148,0.3)]"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Turnos */}
      {cargando ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-[#0f1712]/80 border border-white/10 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="text-xs text-white/60 font-semibold">Cargando turnos de hoy...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : turnosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-[#0f1712]/80 border border-white/10 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-white font-bold text-lg">No hay turnos para mostrar con los filtros actuales</p>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            Probá limpiando la búsqueda o cambiando la fecha seleccionada.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {turnosFiltrados.map((t) => {
            const nombreCliente = t.cliente
              ? [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
              : t.nombreClienteManual || "Cliente sin nombre";
            const telefono = t.cliente?.telefono || t.telefonoClienteManual;
            const telLimpio = limpiarTelefono(telefono);
            const isConfirmado = t.estado === "confirmado";
            const isCompletado = t.estado === "completado";
            const isNoShow = t.estado === "no_show";
            const isProcesando = procesandoId === t.id;

            const depto = getDeporteInfo(t.cancha.deporte);

            return (
              <div
                key={t.id}
                className={`p-5 sm:p-6 rounded-[2rem] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl ${
                  isConfirmado
                    ? "bg-[#0f1712]/95 border-brand/30 hover:border-brand/60"
                    : isCompletado
                    ? "bg-[#0c130e]/80 border-emerald-500/20 opacity-90"
                    : isNoShow
                    ? "bg-[#140d0e]/80 border-rose-500/20 opacity-80"
                    : "bg-[#0f1712]/70 border-white/10 opacity-70"
                }`}
              >
                {/* Horario y Cancha */}
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="px-4 py-3 rounded-2xl bg-surface border border-white/15 text-center shrink-0 shadow-inner">
                    <span className="font-mono text-base sm:text-lg font-black text-brand block leading-tight">
                      {t.horaInicio}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 block">
                      hasta {t.horaFin}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-black text-white text-xl uppercase tracking-wide truncate">
                        {nombreCliente}
                      </h3>
                      <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full inline-block">
                        {t.cancha.nombre}
                      </span>
                      <span className="text-[10px] text-white/50">
                        ({getBadgeDeporte(t.cancha.deporte, t.cancha.capacidad)})
                      </span>
                    </div>

                    {/* Teléfono y WhatsApp */}
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      {telefono ? (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-white/40" />
                          {telefono}
                        </span>
                      ) : (
                        <span className="text-white/40 italic">Sin teléfono registrado</span>
                      )}

                      {telLimpio && (
                        <a
                          href={`https://wa.me/${telLimpio}?text=${encodeURIComponent(
                            `¡Hola ${nombreCliente}! Te escribimos de recepción de ${predio?.nombre || "la cancha"} respecto a tu turno de hoy de ${t.horaInicio} a ${t.horaFin} hs en ${t.cancha.nombre}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#25D366] hover:text-[#2fe671] text-xs font-bold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Puntaje de Asistencia del Cliente */}
                    {t.cliente && (
                      <div className="pt-0.5 flex items-center gap-2">
                        {t.cliente.puntajeAsistencia !== null && t.cliente.puntajeAsistencia !== undefined ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              t.cliente.puntajeAsistencia >= 80
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : t.cliente.puntajeAsistencia >= 50
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>{t.cliente.puntajeAsistencia}% Asistencia</span>
                            <span className="text-white/40">
                              ({t.cliente.turnosAsistidos || 0} asistidos • {t.cliente.turnosNoShow || 0} no-shows)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            Cliente Nuevo (sin historial previo)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Monto y Botones de Asistencia Touch */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                  <div className="text-right">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Importe</span>
                    <span className="font-mono font-black text-base sm:text-lg text-brand">
                      ${t.precioAlMomentoReserva.toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Acciones de Asistencia */}
                  <div className="flex items-center gap-2">
                    {isConfirmado ? (
                      <>
                        <button
                          onClick={() => handleMarcarAsistencia(t.id, true)}
                          disabled={isProcesando}
                          className="py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-surface font-black text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                          title="Marcar que el cliente ya llegó y asistió al turno"
                        >
                          {isProcesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                          <span>Asistió</span>
                        </button>

                        <button
                          onClick={() => handleMarcarAsistencia(t.id, false)}
                          disabled={isProcesando}
                          className="py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Marcar No-Show (cliente ausente)"
                        >
                          <X className="w-4 h-4" />
                          <span>No Asistió</span>
                        </button>
                      </>
                    ) : isCompletado ? (
                      <div className="flex items-center gap-2">
                        <span className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Asistió</span>
                        </span>
                        <button
                          onClick={() => handleMarcarAsistencia(t.id, false)}
                          disabled={isProcesando}
                          className="text-[10px] text-white/40 hover:text-rose-400 underline transition-colors"
                          title="Cambiar a No-Show si hubo error"
                        >
                          Corregir
                        </button>
                      </div>
                    ) : isNoShow ? (
                      <div className="flex items-center gap-2">
                        <span className="px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" />
                          <span>No-Show</span>
                        </span>
                        <button
                          onClick={() => handleMarcarAsistencia(t.id, true)}
                          disabled={isProcesando}
                          className="text-[10px] text-white/40 hover:text-emerald-400 underline transition-colors"
                          title="Cambiar a Asistió si llegó tarde"
                        >
                          Corregir
                        </button>
                      </div>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs capitalize">
                        {t.estado}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
