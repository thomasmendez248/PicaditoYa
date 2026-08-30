"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  DollarSign,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";

export type TurnoItem = {
  id: string;
  canchaId: string;
  clienteId: string | null;
  nombreClienteManual: string | null;
  telefonoClienteManual: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: "pendiente" | "confirmado" | "cancelado_a_tiempo" | "cancelado_tarde" | "completado" | "no_show";
  precioAlMomentoReserva: number;
  cliente?: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
  } | null;
};

type CanchaInfo = {
  id: string;
  nombre: string;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura: string;
  horarioCierre: string;
  diasOperativos: number[];
};

export default function TurneroVisual({
  cancha,
  fecha,
}: {
  cancha: CanchaInfo;
  fecha: string; // YYYY-MM-DD
}) {
  const [turnos, setTurnos] = useState<TurnoItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [horaInicioPrevia, setHoraInicioPrevia] = useState("18:00");
  const [horaFinPrevia, setHoraFinPrevia] = useState("19:00");

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoItem | null>(null);

  // Formulario Nuevo Turno
  const [tipoCliente, setTipoCliente] = useState<"manual" | "registrado">("manual");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [horaInicio, setHoraInicio] = useState("18:00");
  const [horaFin, setHoraFin] = useState("19:00");
  const [estadoTurno, setEstadoTurno] = useState<"confirmado" | "pendiente">("confirmado");
  const [precio, setPrecio] = useState(cancha.precioTurno);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTurnos = useCallback(async () => {
    if (!cancha?.id || !fecha) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/turnos?canchaId=${cancha.id}&fecha=${fecha}`);
      if (!res.ok) throw new Error("Error al obtener los turnos");
      const data = await res.json();
      setTurnos(data.turnos || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar turnos");
    } finally {
      setCargando(false);
    }
  }, [cancha?.id, fecha]);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  // Generar slots basados en duracionTurnoMinutos de la cancha (30 min, 60 min, etc.)
  const duracionCancha = cancha.duracionTurnoMinutos || 60;

  const generarSlots = () => {
    const slots: string[] = [];
    const [aperturaH, aperturaM] = (cancha.horarioApertura || "08:00").split(":").map(Number);
    const [cierreH, cierreM] = (cancha.horarioCierre || "23:00").split(":").map(Number);

    let currentMin = aperturaH * 60 + aperturaM;
    const endMin = cierreH * 60 + cierreM;

    while (currentMin + duracionCancha <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push(timeStr);
      currentMin += duracionCancha; // Respeta 30 min, 60 min o lo configurado
    }

    return slots;
  };

  const slots = generarSlots();

  // Encontrar turno para un slot específico
  const getTurnoForSlot = (slotTime: string) => {
    return turnos.find((t) => {
      // Un slot "HH:mm" está ocupado si horaInicio <= slotTime y slotTime < horaFin
      return t.horaInicio <= slotTime && slotTime < t.horaFin;
    });
  };

  const calcularPrecioProporcional = (ini: string, fin: string) => {
    if (!ini || !fin || !cancha.precioTurno) return cancha.precioTurno;
    const [hIni, mIni] = ini.split(":").map(Number);
    const [hFin, mFin] = fin.split(":").map(Number);
    const inicioMin = hIni * 60 + mIni;
    let finMin = hFin * 60 + mFin;
    if (finMin < inicioMin) finMin += 24 * 60;
    const duracionMin = finMin - inicioMin;
    if (duracionMin <= 0) return cancha.precioTurno;
    return Math.round((cancha.precioTurno * duracionMin) / 60);
  };

  // Click en slot libre para agendar
  const handleSlotLibreClick = (slotTime: string) => {
    setHoraInicio(slotTime);
    // Calcular hora de fin sumando la duración configurada de la cancha
    const [h, m] = slotTime.split(":").map(Number);
    const finTotalMin = h * 60 + m + duracionCancha;
    const finH = Math.floor(finTotalMin / 60);
    const finM = finTotalMin % 60;
    const finStr = `${String(finH).padStart(2, "0")}:${String(finM).padStart(2, "0")}`;

    setHoraFin(finStr);
    setPrecio(calcularPrecioProporcional(slotTime, finStr));
    setNombreCliente("");
    setTelefonoCliente("");
    setClienteId("");
    setTipoCliente("manual");
    setEstadoTurno("confirmado");
    setFormError(null);
    setModalNuevoOpen(true);
  };

  // Crear turno manual
  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setFormError(null);

    try {
      const payload = {
        canchaId: cancha.id,
        fecha,
        horaInicio,
        horaFin,
        nombreClienteManual: tipoCliente === "manual" ? nombreCliente : undefined,
        telefonoClienteManual: tipoCliente === "manual" ? telefonoCliente : undefined,
        clienteId: tipoCliente === "registrado" ? clienteId : undefined,
        estado: estadoTurno,
        precioAlMomentoReserva: Number(precio),
      };

      const res = await fetch("/api/admin/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo agendar el turno");
      }

      await fetchTurnos();
      setModalNuevoOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Error al crear turno");
    } finally {
      setGuardando(false);
    }
  };

  // Cambiar estado de turno
  const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!turnoSeleccionado) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoSeleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) throw new Error("Error al actualizar estado");
      await fetchTurnos();
      setModalDetalleOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar turno
  const handleEliminarTurno = async () => {
    if (!turnoSeleccionado) return;
    const confirm = window.confirm("¿Eliminar este turno y liberar el horario?");
    if (!confirm) return;

    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/turnos/${turnoSeleccionado.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar turno");
      await fetchTurnos();
      setModalDetalleOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Contadores
  const totalConfirmados = turnos.filter((t) => t.estado === "confirmado" || t.estado === "completado").length;
  const totalPendientes = turnos.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="space-y-6">
      
      {/* Barra de Referencia y Resumen */}
      <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Leyenda de Colores */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-white/60 font-bold uppercase tracking-wider text-[11px]">Estado de bloques:</span>
          
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-emerald-400 font-bold">Ocupado / Confirmado</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="text-amber-400 font-bold">Pendiente</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white/20 border border-white/20" />
            <span className="text-white/60 font-medium">Libre</span>
          </div>
        </div>

        {/* Resumen numérico */}
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black">
            {totalConfirmados} Confirmados
          </span>
          <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black">
            {totalPendientes} Pendientes
          </span>
          <button
            onClick={() => handleSlotLibreClick("18:00")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand hover:bg-brand-hover text-surface font-black transition-all shadow-[0_0_12px_rgba(69,228,148,0.3)] hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Turno
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grilla visual de turnos */}
      {cargando ? (
        <div className="h-64 flex items-center justify-center bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2rem]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-xs font-semibold text-white/60">Cargando turnero...</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-brand" />
                Horarios ({cancha.horarioApertura} a {cancha.horarioCierre})
              </h3>
              <span className="text-xs font-black text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
                Turnos de {duracionCancha} min
              </span>
            </div>
            <span className="text-xs text-white/50">Hacé click en cualquier bloque para ver detalles o agendar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
            {slots.map((slotTime) => {
              const turno = getTurnoForSlot(slotTime);
              const isOcupado = !!turno;
              const isPendiente = turno?.estado === "pendiente";
              const isConfirmado = turno && turno.estado !== "pendiente";

              const clienteNombre =
                turno?.nombreClienteManual ||
                turno?.cliente?.nombre ||
                "Cliente";

              const [h, m] = slotTime.split(":").map(Number);
              const finTotal = h * 60 + m + duracionCancha;
              const slotFin = `${String(Math.floor(finTotal / 60)).padStart(2, "0")}:${String(finTotal % 60).padStart(2, "0")}`;
              const precioSlot = Math.round((cancha.precioTurno * duracionCancha) / 60);

              return (
                <div
                  key={slotTime}
                  onClick={() => {
                    if (turno) {
                      setTurnoSeleccionado(turno);
                      setModalDetalleOpen(true);
                    } else {
                      handleSlotLibreClick(slotTime);
                    }
                  }}
                  className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[105px] group ${
                    isConfirmado
                      ? "bg-emerald-500/15 border-emerald-500/50 hover:bg-emerald-500/25 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : isPendiente
                      ? "bg-amber-500/15 border-amber-500/50 hover:bg-amber-500/25 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-brand/60 text-white/60 hover:text-white"
                  }`}
                >
                  {/* Header del bloque: Hora y Badge de estado */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-white">
                      {slotTime}
                    </span>

                    {isConfirmado && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Confirmado" />
                    )}
                    {isPendiente && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" title="Pendiente" />
                    )}
                    {!isOcupado && (
                      <span className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-brand transition-colors" title="Libre" />
                    )}
                  </div>

                  {/* Cuerpo del bloque */}
                  <div className="mt-2">
                    {isOcupado ? (
                      <div>
                        <p className={`text-xs font-black truncate ${isPendiente ? "text-amber-300" : "text-emerald-300"}`}>
                          {clienteNombre}
                        </p>
                        <p className="text-[10px] text-white/50 font-mono truncate mt-0.5">
                          {turno.horaInicio} - {turno.horaFin}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-white/50 group-hover:text-brand font-bold transition-colors">
                          <Plus className="w-3 h-3" />
                          <span>Libre</span>
                        </div>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">
                          hasta {slotFin}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer del bloque con precio o estado */}
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
                    {isOcupado ? (
                      <span className="font-bold text-white">${turno.precioAlMomentoReserva.toLocaleString("es-AR")}</span>
                    ) : (
                      <span className="font-mono font-bold text-brand">${precioSlot.toLocaleString("es-AR")}</span>
                    )}
                    <span className="capitalize">{isOcupado ? turno.estado : "Disponible"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVO TURNO MANUAL ── */}
      {modalNuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Agendar Turno</h2>
                  <p className="text-xs text-white/60">{cancha.nombre} • {fecha}</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoOpen(false)}
                className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearTurno} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Rango Horario Flexible */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Hora Inicio</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="time"
                      required
                      value={horaInicio}
                      onChange={(e) => {
                        const newIni = e.target.value;
                        setHoraInicio(newIni);
                        if (newIni && horaFin) {
                          setPrecio(calcularPrecioProporcional(newIni, horaFin));
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Hora Fin</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="time"
                      required
                      value={horaFin}
                      onChange={(e) => {
                        const newFin = e.target.value;
                        setHoraFin(newFin);
                        if (horaInicio && newFin) {
                          setPrecio(calcularPrecioProporcional(horaInicio, newFin));
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle Tipo de Cliente */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Tipo de Reserva</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setTipoCliente("manual")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      tipoCliente === "manual"
                        ? "bg-brand text-surface shadow-sm font-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Cliente Mostrador / Tel
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCliente("registrado")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      tipoCliente === "registrado"
                        ? "bg-brand text-surface shadow-sm font-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Cliente Registrado
                  </button>
                </div>
              </div>

              {/* Campos Cliente Manual */}
              {tipoCliente === "manual" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Nombre del Cliente *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Juan Pérez"
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Teléfono (opcional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        placeholder="Ej: 3584123456"
                        value={telefonoCliente}
                        onChange={(e) => setTelefonoCliente(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">ID de Usuario</label>
                  <input
                    type="text"
                    required
                    placeholder="CUID del cliente"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
                  />
                </div>
              )}

              {/* Estado Inicial & Precio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Estado</label>
                  <select
                    value={estadoTurno}
                    onChange={(e: any) => setEstadoTurno(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white cursor-pointer"
                  >
                    <option value="confirmado" className="text-black">Confirmado (Verde)</option>
                    <option value="pendiente" className="text-black">Pendiente (Naranja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Precio Cobrado ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={precio}
                      onChange={(e) => setPrecio(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="px-6 py-3 rounded-full border border-white/10 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black px-7 py-3 rounded-full text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(69,228,148,0.3)] hover:scale-105"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLE Y GESTIÓN DE TURNO OCUPADO ── */}
      {modalDetalleOpen && turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    turnoSeleccionado.estado === "pendiente"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Detalle del Turno</h2>
                  <p className="text-xs text-white/60">
                    {cancha.nombre} • {turnoSeleccionado.horaInicio} a {turnoSeleccionado.horaFin}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDetalleOpen(false)}
                className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Información del cliente */}
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Cliente:</span>
                  <span className="text-sm font-bold text-white">
                    {turnoSeleccionado.nombreClienteManual || turnoSeleccionado.cliente?.nombre || "Sin especificar"}
                  </span>
                </div>

                {(turnoSeleccionado.telefonoClienteManual || turnoSeleccionado.cliente?.telefono) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Teléfono:</span>
                    <a
                      href={`tel:${turnoSeleccionado.telefonoClienteManual || turnoSeleccionado.cliente?.telefono}`}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      {turnoSeleccionado.telefonoClienteManual || turnoSeleccionado.cliente?.telefono}
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Monto:</span>
                  <span className="text-sm font-bold text-brand font-mono">
                    ${turnoSeleccionado.precioAlMomentoReserva.toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Estado actual:</span>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full capitalize ${
                      turnoSeleccionado.estado === "pendiente"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {turnoSeleccionado.estado}
                  </span>
                </div>
              </div>

              {/* Acciones de cambio de estado */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Cambiar Estado:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleCambiarEstado("confirmado")}
                    disabled={guardando || turnoSeleccionado.estado === "confirmado"}
                    className="py-3 px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs transition-colors disabled:opacity-40"
                  >
                    Confirmado (Verde)
                  </button>

                  <button
                    onClick={() => handleCambiarEstado("pendiente")}
                    disabled={guardando || turnoSeleccionado.estado === "pendiente"}
                    className="py-3 px-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs transition-colors disabled:opacity-40"
                  >
                    Pendiente (Naranja)
                  </button>

                  <button
                    onClick={() => handleCambiarEstado("completado")}
                    disabled={guardando}
                    className="py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-colors"
                  >
                    Completado
                  </button>

                  <button
                    onClick={() => handleCambiarEstado("no_show")}
                    disabled={guardando}
                    className="py-3 px-3 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                  >
                    No-Show (Faltó)
                  </button>
                </div>
              </div>

              {/* Eliminar / Cancelar Turno */}
              <div className="pt-5 border-t border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleEliminarTurno}
                  disabled={guardando}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Liberar Turno
                </button>

                <button
                  type="button"
                  onClick={() => setModalDetalleOpen(false)}
                  className="px-6 py-2.5 rounded-full border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-colors"
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
