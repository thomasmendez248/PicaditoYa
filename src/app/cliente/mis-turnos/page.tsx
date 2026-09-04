"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";

function limpiarTelefono(tel: string | null | undefined): string {
  if (!tel) return "5493515138542";
  const nums = tel.replace(/\D/g, "");
  if (nums.startsWith("549") || nums.startsWith("54")) return nums;
  if (nums.startsWith("15")) return `549${nums.slice(2)}`;
  return `549${nums}`;
}

type TurnoCliente = {
  id: string;
  canchaId: string;
  clienteId: string;
  nombreClienteManual?: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: "pendiente" | "confirmado" | "cancelado_a_tiempo" | "cancelado_tarde" | "completado" | "no_show";
  precioAlMomentoReserva: number;
  canceladoEn?: string | null;
  fechaCreacion: string;
  cancha: {
    id: string;
    nombre: string;
    capacidad: number;
    precioTurno: number;
    duracionTurnoMinutos: number;
    politicaCancelacionHoras?: number | null;
    predio: {
      id: string;
      nombre: string;
      direccion: string;
      telefono?: string | null;
      politicaCancelacionHoras: number;
    };
  };
};

export default function ClienteMisTurnosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [turnos, setTurnos] = useState<TurnoCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"proximos" | "historial" | "todos">("proximos");

  // Estado para modal de cancelación
  const [turnoACancelar, setTurnoACancelar] = useState<TurnoCliente | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchTurnos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/cliente/turnos");
      if (res.status === 401) {
        router.push("/auth/login?callbackUrl=/cliente/mis-turnos");
        return;
      }
      if (!res.ok) {
        throw new Error("No se pudieron cargar los turnos.");
      }
      const data = await res.json();
      setTurnos(data.turnos || []);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al cargar tus turnos.");
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/cliente/mis-turnos");
    } else if (status === "authenticated") {
      fetchTurnos();
    }
  }, [status, router, fetchTurnos]);

  const handleCancelarTurno = async () => {
    if (!turnoACancelar) return;
    setCancelando(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/turnos/${turnoACancelar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancelar" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cancelar el turno.");
      }

      // Actualizar listado local
      await fetchTurnos();
      setTurnoACancelar(null);
    } catch (err: any) {
      setCancelError(err.message || "Error al cancelar.");
    } finally {
      setCancelando(false);
    }
  };

  const turnosProximos = turnos.filter(
    (t) => t.estado === "pendiente" || t.estado === "confirmado"
  );
  const turnosHistorial = turnos.filter(
    (t) => t.estado !== "pendiente" && t.estado !== "confirmado"
  );

  const turnosFiltrados = 
    filtro === "proximos" 
      ? turnosProximos 
      : filtro === "historial" 
      ? turnosHistorial 
      : turnos;

  const getEstadoBadge = (estado: TurnoCliente["estado"]) => {
    switch (estado) {
      case "confirmado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand/15 text-brand border border-brand/30 shadow-[0_0_10px_rgba(69,228,148,0.15)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmado
          </span>
        );
      case "pendiente":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pendiente de aprobación
          </span>
        );
      case "completado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Jugado / Completado
          </span>
        );
      case "cancelado_a_tiempo":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/60 border border-white/15">
            <XCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      case "cancelado_tarde":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Cancelado fuera de término
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            <XCircle className="w-3.5 h-3.5" />
            No asistió
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-text-main overflow-x-hidden bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/hero-bg.jpg')" }}
    >
      {/* Capa oscura general */}
      <div className="absolute inset-0 bg-surface/95 z-0" />

      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {/* Navbar */}
        <Navbar />

        {/* Header de la sección */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
          
          {/* Título y Bienvenida */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand mb-2">
                <Calendar className="w-4 h-4" />
                <span>Panel de Jugador</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight uppercase">
                Mis Turnos <span className="text-brand">Pedidos</span>
              </h1>
              <p className="text-white/70 text-base md:text-lg mt-1 max-w-2xl">
                Consultá el estado de tus reservas, accedé a los detalles del predio y gestioná tus partidos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchTurnos}
                disabled={cargando}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 border border-white/10"
                title="Actualizar turnos"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-brand" : ""}`} />
                <span>Actualizar</span>
              </button>
              
              <Link
                href="/"
                className="bg-brand hover:bg-brand-hover text-surface px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(69,228,148,0.25)] hover:scale-105 flex items-center gap-1.5"
              >
                <span>Reservar Nueva Cancha</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Tarjetas de Estadísticas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Próximos Turnos</span>
                <p className="text-2xl font-display font-black text-white">{turnosProximos.length}</p>
              </div>
            </div>

            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Historial Total</span>
                <p className="text-2xl font-display font-black text-white">{turnos.length}</p>
              </div>
            </div>

            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Pendientes de Aprobación</span>
                <p className="text-2xl font-display font-black text-white">
                  {turnos.filter((t) => t.estado === "pendiente").length}
                </p>
              </div>
            </div>
          </div>

          {/* Filtros de Pestañas */}
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <button
              onClick={() => setFiltro("proximos")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filtro === "proximos"
                  ? "bg-brand text-surface shadow-[0_0_15px_rgba(69,228,148,0.3)]"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Próximos ({turnosProximos.length})
            </button>
            <button
              onClick={() => setFiltro("historial")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filtro === "historial"
                  ? "bg-brand text-surface shadow-[0_0_15px_rgba(69,228,148,0.3)]"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Historial ({turnosHistorial.length})
            </button>
            <button
              onClick={() => setFiltro("todos")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filtro === "todos"
                  ? "bg-brand text-surface shadow-[0_0_15px_rgba(69,228,148,0.3)]"
                  : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Todos ({turnos.length})
            </button>
          </div>

          {/* Estado de Carga */}
          {cargando && (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-brand" />
              <p className="text-white/60 text-sm">Cargando tus turnos pedidos...</p>
            </div>
          )}

          {/* Estado de Error */}
          {!cargando && error && (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl flex items-center gap-3 text-red-300 my-6">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold">Error al cargar turnos</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Estado Vacío */}
          {!cargando && !error && turnosFiltrados.length === 0 && (
            <div className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 my-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {filtro === "proximos"
                  ? "No tenés turnos activos ni pendientes"
                  : "No tenés turnos registrados en este filtro"}
              </h2>
              <p className="text-white/60 max-w-md text-sm">
                Encontrá canchas disponibles en tu zona, armá el partido con tus amigos y reservá en pocos clics.
              </p>
              <Link
                href="/"
                className="mt-2 bg-brand hover:bg-brand-hover text-surface px-8 py-3 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(69,228,148,0.3)] hover:scale-105"
              >
                Buscar Canchas Disponibles
              </Link>
            </div>
          )}

          {/* Lista de Turnos */}
          {!cargando && !error && turnosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {turnosFiltrados.map((turno) => {
                const fechaDate = new Date(turno.fecha);
                const fechaLegible = format(fechaDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
                const tipoCancha =
                  turno.cancha.capacidad <= 10
                    ? "Fútbol 5"
                    : turno.cancha.capacidad <= 14
                    ? "Fútbol 7"
                    : "Fútbol 11";

                const puedeCancelar = turno.estado === "pendiente" || turno.estado === "confirmado";

                return (
                  <div
                    key={turno.id}
                    className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 hover:border-brand/40 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between gap-5 relative group"
                  >
                    <div>
                      {/* Encabezado de la tarjeta: Estado + Formato */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                          {tipoCancha}
                        </span>
                        {getEstadoBadge(turno.estado)}
                      </div>

                      {/* Nombre Cancha y Predio */}
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-brand transition-colors">
                        {turno.cancha.nombre}
                      </h2>

                      <Link 
                        href={`/predio/${turno.cancha.predio.id}`}
                        className="inline-flex items-center gap-1.5 text-brand font-bold text-sm hover:underline mt-1"
                      >
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{turno.cancha.predio.nombre}</span>
                      </Link>

                      <p className="text-xs text-white/50 mt-1 ml-5">
                        {turno.cancha.predio.direccion}
                      </p>

                      {turno.cancha.predio.telefono && (
                        <p className="text-xs text-white/60 flex items-center gap-1.5 mt-2 ml-5">
                          <Phone className="w-3.5 h-3.5 text-white/40" />
                          <span>{turno.cancha.predio.telefono}</span>
                        </p>
                      )}

                      {/* Info de Fecha y Horario */}
                      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Fecha</span>
                          <span className="text-sm font-semibold text-white capitalize block mt-0.5">
                            {fechaLegible}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Horario</span>
                          <span className="text-sm font-mono font-bold text-brand block mt-0.5">
                            {turno.horaInicio} - {turno.horaFin} hs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer de la tarjeta: Precio y Acciones */}
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Monto</span>
                        <span className="text-xl font-mono font-black text-white">
                          ${turno.precioAlMomentoReserva.toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Botón WhatsApp al Predio con los datos del turno */}
                        {turno.cancha.predio.telefono && (
                          <a
                            href={`https://wa.me/${limpiarTelefono(turno.cancha.predio.telefono)}?text=${encodeURIComponent(
                              `¡Hola! Tengo una reserva en *${turno.cancha.predio.nombre}*:\n\n` +
                              `⚽ *Cancha:* ${turno.cancha.nombre}\n` +
                              `📅 *Fecha:* ${fechaLegible}\n` +
                              `⏰ *Horario:* ${turno.horaInicio} a ${turno.horaFin} hs\n` +
                              `👤 *Titular:* ${turno.nombreClienteManual || session?.user?.name || "Jugador"}\n` +
                              `💰 *Monto:* $${turno.precioAlMomentoReserva.toLocaleString("es-AR")}\n\n` +
                              `Te escribo para coordinar los detalles de mi turno. ¡Muchas gracias!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-xs font-bold text-[#25D366] hover:text-[#42f085] transition-all flex items-center gap-1.5 shadow-sm"
                            title="Enviar mensaje por WhatsApp a la cancha"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <Link
                          href={`/predio/${turno.cancha.predio.id}`}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors flex items-center gap-1"
                        >
                          <span>Ver Predio</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        {puedeCancelar && (
                          <button
                            onClick={() => {
                              setTurnoACancelar(turno);
                              setCancelError(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-bold text-red-300 transition-colors"
                          >
                            Cancelar Turno
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </main>

        <Footer />
      </div>

      {/* ── MODAL DE CONFIRMACIÓN DE CANCELACIÓN ── */}
      {turnoACancelar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0f1712] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              ¿Cancelar reserva de turno?
            </h2>

            <p className="text-white/70 text-sm mt-2">
              Estás a punto de cancelar tu turno en <strong className="text-white">{turnoACancelar.cancha.nombre}</strong> ({turnoACancelar.cancha.predio.nombre}) programado para el <strong className="text-white">{turnoACancelar.fecha.split("T")[0]}</strong> a las <strong className="text-white">{turnoACancelar.horaInicio} hs</strong>.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 space-y-1">
              <p className="font-semibold text-white/80">Política de cancelación:</p>
              <p>
                Mínimo {turnoACancelar.cancha.politicaCancelacionHoras ?? turnoACancelar.cancha.predio.politicaCancelacionHoras}hs de anticipación para no afectar tu puntaje de asistencia.
              </p>
            </div>

            {cancelError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTurnoACancelar(null)}
                disabled={cancelando}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={handleCancelarTurno}
                disabled={cancelando}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {cancelando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <span>Sí, cancelar turno</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
