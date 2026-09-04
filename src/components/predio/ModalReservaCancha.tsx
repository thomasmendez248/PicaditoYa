"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
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
  ExternalLink,
  CalendarCheck,
  ShieldCheck,
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

function limpiarTelefono(tel: string | null | undefined): string {
  if (!tel) return "5493515138542";
  const nums = tel.replace(/\D/g, "");
  if (nums.startsWith("549") || nums.startsWith("54")) return nums;
  if (nums.startsWith("15")) return `549${nums.slice(2)}`;
  return `549${nums}`;
}

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
  const { data: session } = useSession();
  const estaAutenticado = Boolean(session?.user);

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

  // Generar bloques de horarios de inicio según la duración configurada en la cancha
  const slots: string[] = useMemo(() => {
    if (!cancha) return [];
    const [hAp, mAp] = (cancha.horarioApertura || "08:00").split(":").map(Number);
    const [hCi, mCi] = (cancha.horarioCierre || "23:00").split(":").map(Number);
    const dur = cancha.duracionTurnoMinutos || 60;

    let currMin = hAp * 60 + mAp;
    let endMin = hCi * 60 + mCi;
    // Si el horario de cierre es 00:00 o 23:00 o menor que apertura, permitir turnos hasta las 00 hs (1440)
    if (endMin === 0 || endMin <= currMin || (hCi === 23 && mCi === 0) || cancha.horarioCierre === "00:00") {
      endMin = 24 * 60;
    }

    const resultado: string[] = [];

    while (currMin + dur <= endMin) {
      const norm = currMin % (24 * 60);
      const hh = String(Math.floor(norm / 60)).padStart(2, "0");
      const mm = String(norm % 60).padStart(2, "0");
      resultado.push(`${hh}:${mm}`);
      currMin += dur;
    }
    return resultado;
  }, [cancha]);

  // Verificar si un bloque de inicio está ocupado
  const isSlotOcupado = (slotTime: string) => {
    const [hS, mS] = slotTime.split(":").map(Number);
    const slotMin = hS * 60 + mS;
    const dur = cancha?.duracionTurnoMinutos || 60;
    const slotFinMin = slotMin + dur;

    return turnosOcupados.some((t) => {
      const [hI, mI] = t.horaInicio.split(":").map(Number);
      const [hF, mF] = t.horaFin.split(":").map(Number);
      const tIni = hI * 60 + mI;
      let tFin = hF * 60 + mF;
      if (tFin <= tIni) tFin += 24 * 60; // 00:00 representa la medianoche (1440)

      return slotMin < tFin && slotFinMin > tIni;
    });
  };

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

  // Calcular hora fin inicial sumando la duración fija de la cancha
  const calcularHoraFinBase = (inicio: string, durMinutos: number) => {
    if (!inicio) return "";
    const [h, m] = inicio.split(":").map(Number);
    const finTotal = h * 60 + m + durMinutos;
    const norm = finTotal % (24 * 60);
    const hh = String(Math.floor(norm / 60)).padStart(2, "0");
    const mm = String(norm % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Calcular todas las opciones de "Horario hasta" disponibles a partir de la hora de inicio seleccionada
  const opcionesHoraFin = useMemo(() => {
    if (!cancha || !horaInicio) return [];
    const dur = cancha.duracionTurnoMinutos || 60;
    const [hCi, mCi] = (cancha.horarioCierre || "23:00").split(":").map(Number);
    let endMin = hCi * 60 + mCi;
    if (endMin === 0 || (hCi === 23 && mCi === 0) || cancha.horarioCierre === "00:00") {
      endMin = 24 * 60;
    }

    const [hIni, mIni] = horaInicio.split(":").map(Number);
    const startMin = hIni * 60 + mIni;
    let currentFinMin = startMin + dur;
    const resultado: Array<{ hora: string; duracionMin: number; label: string }> = [];

    while (currentFinMin <= endMin) {
      const prevMin = currentFinMin - dur;
      const prevNorm = prevMin % (24 * 60);
      const prevHh = String(Math.floor(prevNorm / 60)).padStart(2, "0");
      const prevMm = String(prevNorm % 60).padStart(2, "0");
      const prevSlot = `${prevHh}:${prevMm}`;

      // Si el tramo [prevSlot, currentFinMin] está ocupado, no se puede extender más allá
      if (isSlotOcupado(prevSlot)) {
        break;
      }

      const norm = currentFinMin % (24 * 60);
      const hh = String(Math.floor(norm / 60)).padStart(2, "0");
      const mm = String(norm % 60).padStart(2, "0");
      const horaStr = `${hh}:${mm}`;
      const diffMin = currentFinMin - startMin;
      const horas = diffMin / 60;
      const horasLabel = Number.isInteger(horas)
        ? `${horas} h${horas > 1 ? "s" : ""}`
        : `${diffMin} min`;

      resultado.push({
        hora: horaStr,
        duracionMin: diffMin,
        label: `${horaStr} (${horasLabel})`,
      });

      // Límite razonable: hasta 4 horas por turno
      if (diffMin >= 240) break;
      currentFinMin += dur;
    }

    return resultado;
  }, [cancha, horaInicio, turnosOcupados]);

  // Al abrir el modal, inicializar valores solo cuando cambia isOpen o la cancha
  useEffect(() => {
    if (cancha && isOpen) {
      setFecha(hoyStr);
      setError(null);
      setReservaExitosa(false);
      setWhatsappUrlGenerado(null);

      if (session?.user?.name) {
        setNombreCliente(session.user.name);
      }
    }
  }, [cancha?.id, isOpen, hoyStr]);

  // Sincronizar horaInicio si cambian los slots válidos
  useEffect(() => {
    if (!cancha) return;
    const dur = cancha.duracionTurnoMinutos || 60;
    if (slots.length > 0) {
      if (!slots.includes(horaInicio)) {
        const esHoy = fecha === hoyStr;
        const ahora = new Date();
        const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
        const slotDisponible = slots.find((s) => {
          const [hS, mS] = s.split(":").map(Number);
          const sMin = hS * 60 + mS;
          const yaPaso = esHoy && sMin <= ahoraMin;
          return !yaPaso && !isSlotOcupado(s);
        }) || slots[0];

        setHoraInicio(slotDisponible);
        setHoraFin(calcularHoraFinBase(slotDisponible, dur));
      }
    } else {
      setHoraInicio("");
      setHoraFin("");
    }
  }, [slots, horaInicio, cancha, fecha, hoyStr, turnosOcupados]);

  // Ajustar horaFin si queda fuera de las opciones válidas
  useEffect(() => {
    if (opcionesHoraFin.length > 0) {
      const existe = opcionesHoraFin.some((o) => o.hora === horaFin);
      if (!existe) {
        setHoraFin(opcionesHoraFin[0].hora);
      }
    }
  }, [opcionesHoraFin, horaFin]);

  // Seleccionar un bloque de inicio
  const seleccionarBloque = (start: string) => {
    const dur = cancha?.duracionTurnoMinutos || 60;
    setHoraInicio(start);
    setHoraFin(calcularHoraFinBase(start, dur));
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

  if (!isOpen || !cancha) return null;

  // Registrar el turno y construir enlace a WhatsApp
  const handleReservar = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombreFinal = estaAutenticado
      ? (session?.user?.name || "Jugador")
      : nombreCliente.trim();

    if (!nombreFinal) {
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
          nombreCliente: nombreFinal,
          telefonoCliente: estaAutenticado ? undefined : telefonoCliente.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el turno");
      }

      // 2. Construir enlace a WhatsApp con los datos completos del turno
      const numLimpio = limpiarTelefono(predio.telefono);
      const mensaje =
        `¡Hola! Acabo de reservar un turno en *${predio.nombre}*:\n\n` +
        `⚽ *Cancha:* ${cancha.nombre}\n` +
        `📅 *Fecha:* ${fecha}\n` +
        `⏰ *Horario:* ${horaInicio} a ${horaFin} hs (${duracionMinutosReal} min)\n` +
        `👤 *Titular:* ${nombreFinal}${telefonoCliente && !estaAutenticado ? `\n📞 *Teléfono:* ${telefonoCliente.trim()}` : ""}\n` +
        `💰 *Total:* $${precioCalculado.toLocaleString("es-AR")}\n\n` +
        `Te escribo para confirmar y coordinar la reserva. ¡Muchas gracias!`;

      const urlWhatsapp = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`;
      setWhatsappUrlGenerado(urlWhatsapp);
      setReservaExitosa(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al procesar la reserva");
      }
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
                Base {duracionCancha} min
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
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {reservaExitosa ? (
            <div className="p-4 sm:p-6 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-wide">
                  ¡Turno Registrado con Éxito!
                </h3>
                <p className="text-sm text-white/70 mt-1">
                  Tu reserva ha sido guardada en el sistema.
                </p>
              </div>

              {/* Resumen del Turno Registrado */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Complejo / Predio:</span>
                  <span className="font-bold text-white">{predio.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Cancha:</span>
                  <span className="font-bold text-white">{cancha.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Fecha:</span>
                  <span className="font-bold text-white">{fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Horario:</span>
                  <span className="font-bold text-brand font-mono">
                    {horaInicio} a {horaFin} hs ({duracionMinutosReal} min)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Titular:</span>
                  <span className="font-bold text-white">
                    {estaAutenticado ? session?.user?.name : nombreCliente}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-white/70 font-bold">Total a abonar:</span>
                  <span className="font-black text-brand text-sm font-mono">
                    ${precioCalculado.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              {/* Botón Destacado de WhatsApp */}
              <div className="space-y-3 pt-2">
                {whatsappUrlGenerado && (
                  <a
                    href={whatsappUrlGenerado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-[#072412] font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_0_25px_rgba(37,211,102,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Enviar Mensaje por WhatsApp a la Cancha</span>
                    <ExternalLink className="w-4 h-4 opacity-75" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-2xl transition-colors"
                >
                  Listo, cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReservar} className="space-y-5">
              
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

              {/* 2. Horarios: Horario Desde (Inicio) y Horario Hasta (Fin) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    2. Horario Desde (Inicio)
                  </label>
                  {cargandoSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />}
                </div>

                {slots.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center py-6 animate-fade-in">
                    <Clock className="w-8 h-8 text-white/30 mx-auto mb-2" />
                    <p className="text-xs font-bold text-white mb-1">
                      No hay horarios disponibles para {fecha === hoyStr ? "lo que resta del día de hoy" : "esta fecha"}
                    </p>
                    <p className="text-[11px] text-white/50">
                      Por favor seleccioná otra fecha en el calendario para ver disponibilidad.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const ocupado = isSlotOcupado(slot);
                      const [hS, mS] = slot.split(":").map(Number);
                      const slotMin = hS * 60 + mS;
                      const esHoy = fecha === hoyStr;
                      const ahora = new Date();
                      const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
                      const yaPaso = esHoy && slotMin <= ahoraMin;
                      const deshabilitado = ocupado || yaPaso;
                      const seleccionado = horaInicio === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={deshabilitado}
                          onClick={() => seleccionarBloque(slot)}
                          className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            seleccionado
                              ? "bg-brand text-surface border-brand shadow-[0_0_12px_rgba(69,228,148,0.4)] scale-105"
                              : deshabilitado
                              ? "bg-white/5 border-white/5 text-white/30 cursor-not-allowed line-through"
                              : "bg-white/5 border-white/10 text-white/80 hover:text-white hover:border-brand/60 hover:bg-white/10"
                          }`}
                        >
                          <span>{slot}</span>
                          <span className="text-[9px] font-sans font-normal opacity-80">
                            {ocupado ? "Ocupado" : yaPaso ? "Pasado" : "Disponible"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selección de Horario Hasta */}
                {horaInicio && opcionesHoraFin.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                        Horario Hasta (Fin)
                      </label>
                      <span className="text-[10px] text-brand font-bold">
                        Duración: {duracionMinutosReal} min
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {opcionesHoraFin.map((opcion) => {
                        const activo = horaFin === opcion.hora;
                        return (
                          <button
                            key={opcion.hora}
                            type="button"
                            onClick={() => setHoraFin(opcion.hora)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                              activo
                                ? "bg-brand text-surface border-brand shadow-[0_0_10px_rgba(69,228,148,0.3)] scale-105"
                                : "bg-white/5 border-white/10 text-white/80 hover:text-white hover:border-brand/40"
                            }`}
                          >
                            {opcion.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Tus Datos: Si el usuario inició sesión, NO se piden campos. Si es invitado, se piden. */}
              {estaAutenticado ? (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand font-black text-sm uppercase">
                      {session?.user?.name ? session.user.name.charAt(0) : "J"}
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">
                        Tus datos de reserva
                      </span>
                      <p className="text-sm font-bold text-white">
                        {session?.user?.name || "Usuario PicaditoYa"}
                      </p>
                      <p className="text-xs text-white/50">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sesión iniciada
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fade-in">
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
              )}

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

              {/* Botón Principal: Confirmar Reserva */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardando || (!estaAutenticado && !nombreCliente.trim()) || !horaInicio || !horaFin}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(69,228,148,0.3)] hover:scale-[1.01] active:scale-[0.98]"
                >
                  {guardando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-5 h-5" />
                  )}
                  <span>Confirmar Reserva de Turno</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
