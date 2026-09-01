"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Loader2,
  User,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

type Cancha = {
  id: string;
  nombre: string;
  capacidad: number;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura: string;
  horarioCierre: string;
  diasOperativos: number[];
};

type Predio = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string | null;
  politicaCancelacionHoras: number | null;
};

export default function ModalReservaCancha({
  isOpen,
  onClose,
  cancha,
  predio,
}: {
  isOpen: boolean;
  onClose: () => void;
  cancha: Cancha | null;
  predio: Predio;
}) {
  const hoyStr = format(new Date(), "yyyy-MM-dd");
  const [fecha, setFecha] = useState(hoyStr);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");

  const [turnosOcupados, setTurnosOcupados] = useState<Array<{ horaInicio: string; horaFin: string }>>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservaExitosa, setReservaExitosa] = useState(false);
  const [whatsappUrlGenerado, setWhatsappUrlGenerado] = useState<string | null>(null);

  const duracionCancha = cancha?.duracionTurnoMinutos || 60;

  // Generar bloques de horarios según la duración configurada en la cancha
  const slots: string[] = useMemo(() => {
    if (!cancha) return [];
    const [hAp, mAp] = (cancha.horarioApertura || "08:00").split(":").map(Number);
    const [hCi, mCi] = (cancha.horarioCierre || "23:00").split(":").map(Number);
    const dur = cancha.duracionTurnoMinutos || 60;

    let currMin = hAp * 60 + mAp;
    const endMin = hCi * 60 + mCi;
    const resultado: string[] = [];

    while (currMin + dur <= endMin) {
      const hh = String(Math.floor(currMin / 60)).padStart(2, "0");
      const mm = String(currMin % 60).padStart(2, "0");
      resultado.push(`${hh}:${mm}`);
      currMin += dur;
    }
    return resultado;
  }, [cancha]);

  // Cargar turnos ocupados de la cancha en la fecha seleccionada
  useEffect(() => {
    if (!cancha || !isOpen) return;

    async function fetchOcupados() {
      setCargandoSlots(true);
      try {
        const res = await fetch(`/api/turnos?canchaId=${cancha!.id}&fecha=${fecha}`);
        const data = await res.json();
        setTurnosOcupados(data.turnos || []);
      } catch {
        setTurnosOcupados([]);
      } finally {
        setCargandoSlots(false);
      }
    }

    fetchOcupados();
  }, [cancha, fecha, isOpen]);

  // Calcular hora fin sumando la duración fija de la cancha
  const calcularHoraFin = (inicio: string, durMinutos: number) => {
    if (!inicio) return "";
    const [h, m] = inicio.split(":").map(Number);
    const finTotal = h * 60 + m + durMinutos;
    const hh = String(Math.floor(finTotal / 60)).padStart(2, "0");
    const mm = String(finTotal % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Al abrir el modal, inicializar valores
  useEffect(() => {
    if (cancha && isOpen) {
      setFecha(hoyStr);
      setError(null);
      setReservaExitosa(false);
      setWhatsappUrlGenerado(null);

      const dur = cancha.duracionTurnoMinutos || 60;
      if (slots.length > 0) {
        const firstSlot = slots[0];
        setHoraInicio(firstSlot);
        setHoraFin(calcularHoraFin(firstSlot, dur));
      } else {
        setHoraInicio(cancha.horarioApertura);
        setHoraFin(cancha.horarioCierre);
      }
    }
  }, [cancha, isOpen, slots]);

  // Seleccionar un bloque
  const seleccionarBloque = (start: string) => {
    const dur = cancha?.duracionTurnoMinutos || 60;
    setHoraInicio(start);
    setHoraFin(calcularHoraFin(start, dur));
    setError(null);
  };

  // Calcular duración real en minutos entre horaInicio y horaFin
  const duracionMinutosReal = useMemo(() => {
    if (!horaInicio || !horaFin) return 0;
    const [hIni, mIni] = horaInicio.split(":").map(Number);
    const [hFin, mFin] = horaFin.split(":").map(Number);
    const inicioMin = hIni * 60 + mIni;
    let finMin = hFin * 60 + mFin;
    if (finMin < inicioMin) finMin += 24 * 60;
    return Math.max(0, finMin - inicioMin);
  }, [horaInicio, horaFin]);

  // Calcular precio proporcional: (precioTurno / 60) * duracionMinutosReal
  const precioCalculado = useMemo(() => {
    if (!cancha || duracionMinutosReal <= 0) return cancha?.precioTurno || 0;
    return Math.round((cancha.precioTurno * duracionMinutosReal) / 60);
  }, [cancha, duracionMinutosReal]);

  // Verificar si un bloque está ocupado
  const isSlotOcupado = (slotTime: string) => {
    return turnosOcupados.some((t) => t.horaInicio <= slotTime && slotTime < t.horaFin);
  };

  if (!isOpen || !cancha) return null;

  // Registrar el turno y abrir WhatsApp directamente
  const handleReservarYWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreCliente.trim()) {
      setError("Por favor ingresá tu nombre para registrar la reserva");
      return;
    }

    if (!horaInicio || !horaFin) {
      setError("Por favor seleccioná un horario para el turno");
      return;
    }

    if (duracionMinutosReal <= 0) {
      setError("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      // 1. Guardar turno en la base de datos
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canchaId: cancha.id,
          fecha,
          horaInicio,
          horaFin,
          nombreCliente: nombreCliente.trim(),
          telefonoCliente: telefonoCliente.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el turno");
      }

      // 2. Construir enlace a WhatsApp con el predio
      const numLimpio = (predio.telefono || "3515138542").replace(/\D/g, "");
      const mensaje = `Hola! Quiero reservar la cancha *${cancha.nombre}* en *${predio.nombre}* para el día *${fecha}* de *${horaInicio} a ${horaFin}* hs.\n\n*Nombre:* ${nombreCliente.trim()}${telefonoCliente ? `\n*Teléfono:* ${telefonoCliente.trim()}` : ""}\n*Monto estimado:* $${precioCalculado.toLocaleString("es-AR")}`;
      const urlWhatsapp = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;

      setWhatsappUrlGenerado(urlWhatsapp);
      setReservaExitosa(true);

      // Abrir WhatsApp en una nueva pestaña
      window.open(urlWhatsapp, "_blank");
    } catch (err: any) {
      setError(err.message || "Error al procesar la reserva");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between p-6 sm:p-7 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand">Reservar Turno</span>
              <span className="text-[10px] font-black text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
                {duracionCancha} min
              </span>
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide mt-0.5">
              {cancha.nombre}
            </h2>
            <p className="text-xs text-white/60">
              {predio.nombre} • ${cancha.precioTurno.toLocaleString("es-AR")} / hora
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {reservaExitosa ? (
            <div className="p-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(69,228,148,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-display font-black text-white uppercase tracking-wide">
                ¡Turno Registrado!
              </h3>

              <p className="text-sm text-white/80">
                Tu reserva para <strong className="text-white">{nombreCliente}</strong> el día <strong className="text-white">{fecha}</strong> de <strong className="text-brand">{horaInicio} a {horaFin} hs</strong> ha sido guardada.
              </p>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs text-balance">
                Se abrió WhatsApp para que coordines directamente con <strong>{predio.nombre}</strong>. Si no se abrió la ventana, podés hacer clic en el botón de abajo.
              </div>

              <div className="space-y-3 pt-2">
                {whatsappUrlGenerado && (
                  <a
                    href={whatsappUrlGenerado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-surface font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir Chat de WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-2xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReservarYWhatsApp} className="space-y-5">
              
              {/* 1. Selector de Fecha */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  1. Seleccioná la Fecha
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="date"
                    min={hoyStr}
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* 2. Bloques de Horarios Disponibles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    2. Horarios Disponibles ({duracionCancha} min)
                  </label>
                  {cargandoSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const ocupado = isSlotOcupado(slot);
                    const seleccionado = horaInicio === slot;
                    const slotFin = calcularHoraFin(slot, duracionCancha);

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={ocupado}
                        onClick={() => seleccionarBloque(slot)}
                        className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          seleccionado
                            ? "bg-brand text-surface border-brand shadow-[0_0_12px_rgba(69,228,148,0.4)] scale-105"
                            : ocupado
                            ? "bg-white/5 border-white/5 text-white/30 cursor-not-allowed line-through"
                            : "bg-white/5 border-white/10 text-white/80 hover:text-white hover:border-brand/60 hover:bg-white/10"
                        }`}
                      >
                        <span>{slot}</span>
                        <span className="text-[9px] font-sans font-normal opacity-80">
                          {ocupado ? "Ocupado" : `a ${slotFin}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Tus Datos (Nombre y Teléfono) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 block">
                  3. Tus Datos para la Reserva
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-white/50 mb-1">Nombre y Apellido *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Juan Pérez"
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/50 mb-1">Teléfono / WhatsApp (opcional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                      <input
                        type="tel"
                        placeholder="Ej: 351 123 4567"
                        value={telefonoCliente}
                        onChange={(e) => setTelefonoCliente(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Reserva */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-brand/10 border border-brand/20">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand block">
                    Total Estimado ({duracionMinutosReal} min)
                  </span>
                  <span className="text-xs text-white/70">
                    {cancha.nombre} • {horaInicio || "--:--"} a {horaFin || "--:--"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-black text-brand">
                    ${precioCalculado.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              {/* Botón Principal: Reservar y WhatsApp */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardando || !nombreCliente.trim() || !horaInicio || !horaFin}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-surface font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
                >
                  {guardando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5 fill-current" />
                  )}
                  <span>Pedir Turno y Abrir WhatsApp</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
