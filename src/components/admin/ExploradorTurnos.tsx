"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MessageCircle,
  Phone,
  Mail,
  User,
  DollarSign,
  Loader2,
  RefreshCw,
  Eye,
  Check,
  X,
  Trash2,
  ChevronDown,
  CircleDot,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function limpiarTelefono(tel: string | null | undefined): string {
  if (!tel) return "";
  const nums = tel.replace(/\D/g, "");
  if (nums.startsWith("549") || nums.startsWith("54")) return nums;
  if (nums.startsWith("15")) return `549${nums.slice(2)}`;
  return `549${nums}`;
}

export type TurnoItem = {
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
    capacidad: number;
    precioTurno: number;
    predio: {
      id: string;
      nombre: string;
      direccion: string;
      telefono?: string | null;
    };
  };
  cliente?: {
    id: string;
    nombre: string;
    apellido?: string | null;
    email: string;
    telefono?: string | null;
    image?: string | null;
    puntajeAsistencia?: number | null;
  } | null;
};

type CanchaOption = {
  id?: string;
  nombre: string;
};

interface ExploradorTurnosProps {
  predioId: string;
  canchas: CanchaOption[];
  onCambioTurno?: () => void;
}

export default function ExploradorTurnos({
  predioId,
  canchas,
  onCambioTurno,
}: ExploradorTurnosProps) {
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroFecha, setFiltroFecha] = useState<string>("");
  const [filtroCanchaId, setFiltroCanchaId] = useState<string>("todas");

  // Acciones y Modal de detalle
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoItem | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Cargar turnos con los filtros
  const fetchTurnos = useCallback(async () => {
    if (!predioId) return;
    setCargando(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("predioId", predioId);
      params.append("modoExplorador", "true");

      if (filtroCanchaId && filtroCanchaId !== "todas") {
        params.append("canchaId", filtroCanchaId);
      }
      if (filtroFecha) {
        params.append("fecha", filtroFecha);
      }
      if (filtroEstado && filtroEstado !== "todos") {
        params.append("estado", filtroEstado);
      }
      if (busqueda.trim()) {
        params.append("busqueda", busqueda.trim());
      }

      const res = await fetch(`/api/admin/turnos?${params.toString()}`);
      if (!res.ok) throw new Error("Error al consultar los turnos");
      const data = await res.json();
      setTurnos(data.turnos || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar turnos");
    } finally {
      setCargando(false);
    }
  }, [predioId, filtroCanchaId, filtroFecha, filtroEstado, busqueda]);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // Actualizar estado de turno (confirmar, cancelar, completar)
  const handleActualizarEstado = async (turnoId: string, nuevoEstado: string) => {
    setProcesandoId(turnoId);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el estado");

      // Actualizar listado local
      setTurnos((prev) =>
        prev.map((t) => (t.id === turnoId ? { ...t, estado: nuevoEstado as any } : t))
      );

      if (turnoSeleccionado && turnoSeleccionado.id === turnoId) {
        setTurnoSeleccionado((prev) => (prev ? { ...prev, estado: nuevoEstado as any } : null));
      }

      if (onCambioTurno) onCambioTurno();
    } catch (err: any) {
      alert(err.message || "Error al actualizar estado");
    } finally {
      setProcesandoId(null);
    }
  };

  // Eliminar turno
  const handleEliminarTurno = async (turnoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro de turno?")) return;
    setProcesandoId(turnoId);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("No se pudo eliminar el turno");

      setTurnos((prev) => prev.filter((t) => t.id !== turnoId));
      if (turnoSeleccionado?.id === turnoId) setTurnoSeleccionado(null);
      if (onCambioTurno) onCambioTurno();
    } catch (err: any) {
      alert(err.message || "Error al eliminar turno");
    } finally {
      setProcesandoId(null);
    }
  };

  // Cálculos estadísticos sobre la lista cargada
  const metricas = useMemo(() => {
    const total = turnos.length;
    const pendientes = turnos.filter((t) => t.estado === "pendiente").length;
    const confirmados = turnos.filter((t) => t.estado === "confirmado").length;
    const completados = turnos.filter((t) => t.estado === "completado").length;
    const cancelados = turnos.filter(
      (t) => t.estado === "cancelado_a_tiempo" || t.estado === "cancelado_tarde"
    ).length;
    const ingresosEstimados = turnos
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .reduce((sum, t) => sum + t.precioAlMomentoReserva, 0);

    return { total, pendientes, confirmados, completados, cancelados, ingresosEstimados };
  }, [turnos]);

  // Formatear badge de estado
  const renderBadgeEstado = (estado: TurnoItem["estado"]) => {
    switch (estado) {
      case "confirmado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand/15 text-brand border border-brand/30">
            <CheckCircle2 className="w-3 h-3" />
            Confirmado
          </span>
        );
      case "pendiente":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case "completado":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Jugado
          </span>
        );
      case "cancelado_a_tiempo":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white/60 border border-white/15">
            <XCircle className="w-3 h-3" />
            Cancelado a tiempo
          </span>
        );
      case "cancelado_tarde":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            Cancelado
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            <XCircle className="w-3 h-3" />
            No asistió
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── TARJETAS DE RESUMEN ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f1712]/90 border border-white/10 p-4 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Turnos Filtrados</span>
          <span className="text-2xl font-mono font-black text-white">{metricas.total}</span>
        </div>
        <div className="bg-[#0f1712]/90 border border-amber-500/20 p-4 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">Por Aprobar</span>
          <span className="text-2xl font-mono font-black text-amber-300">{metricas.pendientes}</span>
        </div>
        <div className="bg-[#0f1712]/90 border border-brand/20 p-4 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brand block">Confirmados / Jugados</span>
          <span className="text-2xl font-mono font-black text-brand">
            {metricas.confirmados + metricas.completados}
          </span>
        </div>
        <div className="bg-[#0f1712]/90 border border-white/10 p-4 rounded-2xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Monto Estimado</span>
          <span className="text-2xl font-mono font-black text-white">
            ${metricas.ingresosEstimados.toLocaleString("es-AR")}
          </span>
        </div>
      </div>

      {/* ── BARRA DE FILTROS AVANZADOS ── */}
      <div className="bg-[#0f1712]/90 border border-white/10 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Buscador de Cliente (Nombre, Teléfono, Email) */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por cliente (nombre, teléfono o email)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Cancha */}
          <div className="w-full md:w-56">
            <select
              value={filtroCanchaId}
              onChange={(e) => setFiltroCanchaId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
            >
              <option value="todas" className="text-black">Todas las canchas</option>
              {canchas
                .filter((c) => Boolean(c.id))
                .map((c) => (
                  <option key={c.id!} value={c.id!} className="text-black">
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* Filtro de Fecha */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-44">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand [color-scheme:dark]"
              />
            </div>

            {filtroFecha && (
              <button
                onClick={() => setFiltroFecha("")}
                className="bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-semibold px-3 py-2.5 rounded-xl border border-white/10 transition-colors whitespace-nowrap"
                title="Quitar filtro de fecha (ver todas las fechas)"
              >
                Todas las fechas
              </button>
            )}
            
            <button
              onClick={() => setFiltroFecha(format(new Date(), "yyyy-MM-dd"))}
              className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-colors whitespace-nowrap ${
                filtroFecha === format(new Date(), "yyyy-MM-dd")
                  ? "bg-brand text-surface border-brand"
                  : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
              }`}
            >
              Hoy
            </button>
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={fetchTurnos}
            disabled={cargando}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors shrink-0"
            title="Recargar turnos"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-brand" : ""}`} />
          </button>

        </div>

        {/* Filtro de Estados (Pills / Botones) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/10">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider mr-1">Estado:</span>
          {[
            { id: "todos", label: "Todos" },
            { id: "pendiente", label: "Pendientes", badgeClass: "text-amber-400" },
            { id: "confirmado", label: "Confirmados", badgeClass: "text-brand" },
            { id: "completado", label: "Jugados" },
            { id: "cancelados", label: "Cancelados" },
            { id: "no_show", label: "No Asistió" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFiltroEstado(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroEstado === item.id
                  ? "bg-brand text-surface shadow-[0_0_12px_rgba(69,228,148,0.3)]"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTADO / TABLA DE TURNOS ── */}
      {cargando ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-[#0f1712]/90 border border-white/10 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="text-xs text-white/50 font-semibold">Cargando turnos...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm">
          {error}
        </div>
      ) : turnos.length === 0 ? (
        <div className="p-12 text-center bg-[#0f1712]/90 border border-white/10 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-white font-bold text-base">No se encontraron turnos con los filtros seleccionados</p>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            Probá ajustando la búsqueda por cliente, seleccionando otra fecha o cambiando el filtro de estado.
          </p>
        </div>
      ) : (
        <div className="bg-[#0f1712]/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Fecha y Horario</th>
                  <th className="py-3.5 px-4">Cancha</th>
                  <th className="py-3.5 px-4">Cliente / Titular</th>
                  <th className="py-3.5 px-4">Monto</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {turnos.map((turno) => {
                  const [y, m, d] = turno.fecha.split("T")[0].split("-").map(Number);
                  const fechaObj = new Date(y, m - 1, d, 12, 0, 0);
                  const fechaLegible = format(fechaObj, "dd/MM/yyyy (EEE)", { locale: es });
                  
                  const nombreCliente = turno.cliente
                    ? [turno.cliente.nombre, turno.cliente.apellido].filter(Boolean).join(" ")
                    : turno.nombreClienteManual || "Cliente sin nombre";
                  const telefono =
                    turno.cliente?.telefono || turno.telefonoClienteManual || null;
                  const email = turno.cliente?.email || null;
                  const esRegistrado = Boolean(turno.cliente);

                  const telLimpio = limpiarTelefono(telefono);

                  return (
                    <tr
                      key={turno.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Fecha y Horario */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-white block capitalize">{fechaLegible}</span>
                        <span className="font-mono text-brand font-bold text-[11px] block mt-0.5">
                          {turno.horaInicio} a {turno.horaFin} hs
                        </span>
                      </td>

                      {/* Cancha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-white block">{turno.cancha.nombre}</span>
                        <span className="text-[10px] text-white/40 block">
                          Fútbol {turno.cancha.capacidad <= 10 ? 5 : turno.cancha.capacidad <= 14 ? 7 : 11}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center text-brand font-black text-xs shrink-0 uppercase">
                            {nombreCliente.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white truncate block max-w-[160px]">
                                {nombreCliente}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                  esRegistrado
                                    ? "bg-brand/10 text-brand border border-brand/20"
                                    : "bg-white/10 text-white/50"
                                }`}
                              >
                                {esRegistrado ? "Usuario" : "Invitado"}
                              </span>
                            </div>
                            {(telefono || email) && (
                              <span className="text-[11px] text-white/50 block truncate max-w-[180px]">
                                {telefono || email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-white">
                        ${turno.precioAlMomentoReserva.toLocaleString("es-AR")}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderBadgeEstado(turno.estado)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Botón WhatsApp al cliente */}
                          {telLimpio && (
                            <a
                              href={`https://wa.me/${telLimpio}?text=${encodeURIComponent(
                                `¡Hola ${nombreCliente}! Te escribimos de *${turno.cancha.predio.nombre}* respecto a tu turno de cancha para el día ${format(fechaObj, "EEEE d 'de' MMMM", { locale: es })} de ${turno.horaInicio} a ${turno.horaFin} hs en ${turno.cancha.nombre}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] transition-colors border border-[#25D366]/30"
                              title="Enviar mensaje por WhatsApp al cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Acciones de Estado Rápidas */}
                          {turno.estado === "pendiente" && (
                            <>
                              <button
                                onClick={() => handleActualizarEstado(turno.id, "confirmado")}
                                disabled={procesandoId === turno.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition-colors flex items-center gap-1"
                                title="Aprobar y Confirmar Turno"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => handleActualizarEstado(turno.id, "cancelado_a_tiempo")}
                                disabled={procesandoId === turno.id}
                                className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors"
                                title="Rechazar solicitud"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {turno.estado === "confirmado" && (
                            <>
                              <button
                                onClick={() => handleActualizarEstado(turno.id, "completado")}
                                disabled={procesandoId === turno.id}
                                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] border border-sky-500/30 transition-colors"
                                title="Marcar como jugado / asistió"
                              >
                                Completar
                              </button>
                              <button
                                onClick={() => handleActualizarEstado(turno.id, "cancelado_a_tiempo")}
                                disabled={procesandoId === turno.id}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 border border-white/10 transition-colors"
                                title="Cancelar turno"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Ver Detalle */}
                          <button
                            onClick={() => setTurnoSeleccionado(turno)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar registro */}
                          <button
                            onClick={() => handleEliminarTurno(turno.id)}
                            disabled={procesandoId === turno.id}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DE DETALLES DEL TURNO ── */}
      {turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1712] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand block">
                  Detalle del Turno
                </span>
                <h3 className="text-xl font-display font-black text-white uppercase mt-0.5">
                  {turnoSeleccionado.cancha.nombre}
                </h3>
              </div>
              <button
                onClick={() => setTurnoSeleccionado(null)}
                className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Estado actual:</span>
                <div>{renderBadgeEstado(turnoSeleccionado.estado)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Fecha:</span>
                <span className="font-bold text-white">
                  {turnoSeleccionado.fecha.split("T")[0]}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Horario:</span>
                <span className="font-mono font-bold text-brand">
                  {turnoSeleccionado.horaInicio} a {turnoSeleccionado.horaFin} hs
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Monto del turno:</span>
                <span className="font-mono font-bold text-white text-sm">
                  ${turnoSeleccionado.precioAlMomentoReserva.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Titular de la reserva:</span>
                <span className="font-bold text-white">
                  {turnoSeleccionado.cliente
                    ? [turnoSeleccionado.cliente.nombre, turnoSeleccionado.cliente.apellido].filter(Boolean).join(" ")
                    : turnoSeleccionado.nombreClienteManual || "Sin nombre"}
                </span>
              </div>
              {(turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual) && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Teléfono:</span>
                  <span className="font-mono text-white">
                    {turnoSeleccionado.cliente?.telefono || turnoSeleccionado.telefonoClienteManual}
                  </span>
                </div>
              )}
              {turnoSeleccionado.cliente?.email && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Email de cuenta:</span>
                  <span className="text-white/80">{turnoSeleccionado.cliente.email}</span>
                </div>
              )}
            </div>

            {/* Acciones de cambio de estado en el modal */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Cambiar Estado del Turno:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleActualizarEstado(turnoSeleccionado.id, "confirmado")}
                  className="px-3 py-2 rounded-xl bg-brand/20 hover:bg-brand/30 border border-brand/40 text-brand text-xs font-bold transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => handleActualizarEstado(turnoSeleccionado.id, "completado")}
                  className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold transition-colors"
                >
                  Jugado
                </button>
                <button
                  onClick={() => handleActualizarEstado(turnoSeleccionado.id, "pendiente")}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors"
                >
                  Pendiente
                </button>
                <button
                  onClick={() => handleActualizarEstado(turnoSeleccionado.id, "cancelado_a_tiempo")}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-colors"
                >
                  Cancelado
                </button>
                <button
                  onClick={() => handleActualizarEstado(turnoSeleccionado.id, "no_show")}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-colors"
                >
                  No asistió
                </button>
                <button
                  onClick={() => handleEliminarTurno(turnoSeleccionado.id)}
                  className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setTurnoSeleccionado(null)}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-2xl transition-colors"
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
