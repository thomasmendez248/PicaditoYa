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
  Plus,
  Eye,
  Edit3,
  History,
  Shield,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFechaHoyArgentina, getHoraActualArgentina } from "@/lib/date-utils";
import { getBadgeDeporte, getDeporteInfo } from "@/lib/sports";

interface Auditoria {
  id: string;
  accion: string;
  detalle: string | null;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  };
}

interface CanchaSimple {
  id: string;
  nombre: string;
  deporte?: string;
  capacidad: number;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura?: string;
  horarioCierre?: string;
}

interface TurnoEmpleado {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: "pendiente" | "confirmado" | "cancelado_a_tiempo" | "cancelado_tarde" | "completado" | "no_show";
  precioAlMomentoReserva: number;
  nombreClienteManual?: string | null;
  telefonoClienteManual?: string | null;
  cancha: CanchaSimple;
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
  auditorias?: Auditoria[];
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

const ESTADOS_DISPONIBLES = [
  { valor: "confirmado", label: "Confirmado", color: "text-brand border-brand/30 bg-brand/10" },
  { valor: "pendiente", label: "Pendiente", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { valor: "completado", label: "Completado (Asistió)", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { valor: "no_show", label: "No Asistió (No-Show)", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { valor: "cancelado_a_tiempo", label: "Cancelado a tiempo", color: "text-white/60 border-white/20 bg-white/5" },
  { valor: "cancelado_tarde", label: "Cancelado tarde", color: "text-rose-300 border-rose-400/20 bg-rose-500/5" },
];

export default function EmpleadoTurneroPage() {
  const hoyStr = getFechaHoyArgentina();

  const [fecha, setFecha] = useState<string>(hoyStr);
  const [horaActual, setHoraActual] = useState<string>(getHoraActualArgentina());
  const [turnos, setTurnos] = useState<TurnoEmpleado[]>([]);
  const [canchas, setCanchas] = useState<CanchaSimple[]>([]);
  const [predio, setPredio] = useState<PredioInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "confirmados" | "completados" | "no_show">("todos");

  // Procesamiento rápido asistencia
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Crear Turno
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [formCrear, setFormCrear] = useState({
    canchaId: "",
    fecha: hoyStr,
    horaInicio: "18:00",
    horaFin: "19:00",
    nombreClienteManual: "",
    telefonoClienteManual: "",
    precioAlMomentoReserva: 0,
    estado: "confirmado" as const,
  });

  // Modal Ver Detalle & Editar Estado
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoEmpleado | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string>("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraActual(getHoraActualArgentina());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Cargar turnos del día y canchas
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
      setCanchas(data.canchas || []);
      setPredio(data.predio || null);

      if (data.canchas && data.canchas.length > 0 && !formCrear.canchaId) {
        setFormCrear((prev) => ({
          ...prev,
          canchaId: data.canchas[0].id,
          precioAlMomentoReserva: data.canchas[0].precioTurno || 0,
        }));
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión al cargar turnos");
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // Cuando cambia cancha en creación, auto-calcular precio y horaFin estimada
  const handleCanchaChange = (canchaId: string) => {
    const cancha = canchas.find((c) => c.id === canchaId);
    if (!cancha) return;

    let horaFinCalc = formCrear.horaFin;
    if (formCrear.horaInicio && cancha.duracionTurnoMinutos) {
      const [h, m] = formCrear.horaInicio.split(":").map(Number);
      const totalMin = h * 60 + m + cancha.duracionTurnoMinutos;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      horaFinCalc = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    setFormCrear((prev) => ({
      ...prev,
      canchaId,
      precioAlMomentoReserva: cancha.precioTurno || 0,
      horaFin: horaFinCalc,
    }));
  };

  const handleHoraInicioChange = (horaInicio: string) => {
    const cancha = canchas.find((c) => c.id === formCrear.canchaId);
    let horaFinCalc = formCrear.horaFin;
    if (cancha && cancha.duracionTurnoMinutos) {
      const [h, m] = horaInicio.split(":").map(Number);
      const totalMin = h * 60 + m + cancha.duracionTurnoMinutos;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      horaFinCalc = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }
    setFormCrear((prev) => ({ ...prev, horaInicio, horaFin: horaFinCalc }));
  };

  // Crear Turno
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear(null);
    setGuardandoCrear(true);

    try {
      const res = await fetch("/api/empleado/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formCrear),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el turno");
      }

      setModalCrearOpen(false);
      // Reset form
      setFormCrear((prev) => ({
        ...prev,
        nombreClienteManual: "",
        telefonoClienteManual: "",
      }));
      fetchTurnos();
    } catch (err: any) {
      setErrorCrear(err.message);
    } finally {
      setGuardandoCrear(false);
    }
  };

  // Abrir Modal de Detalle
  const handleAbrirDetalle = (t: TurnoEmpleado) => {
    setTurnoSeleccionado(t);
    setNuevoEstado(t.estado);
    setErrorEstado(null);
  };

  // Guardar Cambio de Estado
  const handleGuardarCambioEstado = async () => {
    if (!turnoSeleccionado) return;
    setGuardandoEstado(true);
    setErrorEstado(null);

    try {
      const res = await fetch(`/api/empleado/turnos/${turnoSeleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar el estado");
      }

      setTurnoSeleccionado(null);
      fetchTurnos();
    } catch (err: any) {
      setErrorEstado(err.message);
    } finally {
      setGuardandoEstado(false);
    }
  };

  // Marcar Asistencia rápida (Asistió / No-Show)
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

      const nuevoEst = asistio ? "completado" : "no_show";

      // Actualizar listado local de inmediato
      setTurnos((prev) =>
        prev.map((t) => (t.id === turnoId ? { ...t, estado: nuevoEst } : t))
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
      if (filtroEstado === "confirmados" && t.estado !== "confirmado") return false;
      if (filtroEstado === "completados" && t.estado !== "completado") return false;
      if (filtroEstado === "no_show" && t.estado !== "no_show") return false;

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
            Recepción, control de asistencia y reservas del complejo
          </p>
        </div>

        {/* Acciones: Selector de Fecha, Refrescar y Crear Turno */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

          <button
            onClick={() => {
              setErrorCrear(null);
              setFormCrear((prev) => ({ ...prev, fecha }));
              setModalCrearOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Turno</span>
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
          <span className="text-xs text-white/60 font-semibold">Cargando turnos...</span>
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

            // Última auditoría de modificación
            const ultimaAuditoria = t.auditorias && t.auditorias.length > 0 ? t.auditorias[0] : null;

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

                    {/* Puntaje de Asistencia & Auditoría rápida */}
                    <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                      {t.cliente && (
                        <>
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
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                              Cliente Nuevo
                            </span>
                          )}
                        </>
                      )}

                      {ultimaAuditoria && (
                        <span className="text-[10px] text-white/40 flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          <History className="w-2.5 h-2.5 text-brand" />
                          Modificado por: {ultimaAuditoria.usuario.nombre} ({ultimaAuditoria.usuario.rol})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Importe, Ver Detalle y Acciones */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                  <div className="text-right pr-2">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Importe</span>
                    <span className="font-mono font-black text-base sm:text-lg text-brand">
                      ${t.precioAlMomentoReserva.toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Botón Ver Detalle & Editar Estado */}
                  <button
                    onClick={() => handleAbrirDetalle(t)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Ver detalle del turno y editar estado"
                  >
                    <Eye className="w-4 h-4 text-brand" />
                    <span className="hidden sm:inline">Detalle</span>
                  </button>

                  {/* Acciones de Asistencia Rápida */}
                  <div className="flex items-center gap-2">
                    {isConfirmado ? (
                      <>
                        <button
                          onClick={() => handleMarcarAsistencia(t.id, true)}
                          disabled={isProcesando}
                          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-surface font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                          title="Marcar que el cliente ya llegó y asistió al turno"
                        >
                          {isProcesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>Asistió</span>
                        </button>

                        <button
                          onClick={() => handleMarcarAsistencia(t.id, false)}
                          disabled={isProcesando}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="Marcar No-Show (cliente ausente)"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">No Asistió</span>
                        </button>
                      </>
                    ) : isCompletado ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Asistió</span>
                      </span>
                    ) : isNoShow ? (
                      <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>No Asistió</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs capitalize">
                        {t.estado.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREAR TURNO ── */}
      {modalCrearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121b15] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalCrearOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nuevo Turno en {predio?.nombre || "el Complejo"}</h3>
                <p className="text-xs text-white/50">Crea una reserva para recepción</p>
              </div>
            </div>

            {errorCrear && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorCrear}</span>
              </div>
            )}

            <form onSubmit={handleCrearTurno} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Cancha *
                </label>
                <select
                  required
                  value={formCrear.canchaId}
                  onChange={(e) => handleCanchaChange(e.target.value)}
                  className="w-full bg-[#0a100d] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand cursor-pointer"
                >
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.deporte || "Fútbol"} - {c.duracionTurnoMinutos} min) - ${c.precioTurno}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formCrear.fecha}
                    onChange={(e) => setFormCrear({ ...formCrear, fecha: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={formCrear.horaInicio}
                    onChange={(e) => handleHoraInicioChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required
                    value={formCrear.horaFin}
                    onChange={(e) => setFormCrear({ ...formCrear, horaFin: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcos Gómez"
                    value={formCrear.nombreClienteManual}
                    onChange={(e) => setFormCrear({ ...formCrear, nombreClienteManual: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Teléfono (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 11 4455-6677"
                    value={formCrear.telefonoClienteManual}
                    onChange={(e) => setFormCrear({ ...formCrear, telefonoClienteManual: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Precio ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formCrear.precioAlMomentoReserva}
                    onChange={(e) => setFormCrear({ ...formCrear, precioAlMomentoReserva: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Estado Inicial
                  </label>
                  <select
                    value={formCrear.estado}
                    onChange={(e) => setFormCrear({ ...formCrear, estado: e.target.value as any })}
                    className="w-full bg-[#0a100d] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalCrearOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCrear}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  {guardandoCrear ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Crear Turno
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VER DETALLE & EDITAR ESTADO (CON HISTORIAL DE AUDITORÍA) ── */}
      {turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121b15] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setTurnoSeleccionado(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera modal */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Detalle de Turno</h3>
                <p className="text-xs text-white/50">
                  {turnoSeleccionado.cancha.nombre} • {turnoSeleccionado.horaInicio} a {turnoSeleccionado.horaFin} hs
                </p>
              </div>
            </div>

            {errorEstado && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorEstado}</span>
              </div>
            )}

            {/* Información del Cliente */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Cliente</span>
                <span className="text-xs text-brand font-mono font-bold">
                  ${turnoSeleccionado.precioAlMomentoReserva.toLocaleString("es-AR")}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {turnoSeleccionado.cliente
                    ? `${turnoSeleccionado.cliente.nombre} ${turnoSeleccionado.cliente.apellido || ""}`
                    : turnoSeleccionado.nombreClienteManual || "Cliente sin nombre"}
                </h4>
                {turnoSeleccionado.cliente?.email && (
                  <p className="text-xs text-white/60 font-mono">{turnoSeleccionado.cliente.email}</p>
                )}
              </div>

              {(turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual) && (
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <span className="text-white/70 font-mono">
                    {turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual}
                  </span>
                  {limpiarTelefono(turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual) && (
                    <a
                      href={`https://wa.me/${limpiarTelefono(
                        turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#25D366] hover:underline font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Enviar WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── SECCIÓN: EDITAR ESTADO (SOLO CAMBIAR ESTADO, NO ELIMINAR) ── */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3 mb-5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Cambiar Estado del Turno
                </h4>
              </div>
              <p className="text-xs text-white/50">
                Seleccioná el nuevo estado. El cambio quedará registrado en la auditoría con tu usuario.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {ESTADOS_DISPONIBLES.map((est) => (
                  <button
                    key={est.valor}
                    type="button"
                    onClick={() => setNuevoEstado(est.valor)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                      nuevoEstado === est.valor
                        ? `${est.color} ring-2 ring-brand/50`
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{est.label}</span>
                    {nuevoEstado === est.valor && <Check className="w-3.5 h-3.5 text-brand" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGuardarCambioEstado}
                  disabled={guardandoEstado || nuevoEstado === turnoSeleccionado.estado}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-40 cursor-pointer"
                >
                  {guardandoEstado ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Guardar Estado
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── SECCIÓN: REGISTRO DE AUDITORÍA (QUIÉN MODIFICÓ EL TURNO) ── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Historial de Auditoría
                </h4>
              </div>

              {turnoSeleccionado.auditorias && turnoSeleccionado.auditorias.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {turnoSeleccionado.auditorias.map((aud) => (
                    <div
                      key={aud.id}
                      className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-brand" />
                          {aud.usuario.nombre} {aud.usuario.apellido}
                          <span className="text-[10px] text-white/40 uppercase font-mono">
                            ({aud.usuario.rol})
                          </span>
                        </span>
                        <span className="text-[10px] text-white/40">
                          {format(new Date(aud.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-white/70">
                        Acción: <strong className="text-brand capitalize">{aud.accion.replace("_", " ")}</strong>
                        {aud.detalle && ` — ${aud.detalle}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 italic bg-white/5 border border-white/5 rounded-xl p-3">
                  No hay registros de auditoría previos para este turno.
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setTurnoSeleccionado(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
