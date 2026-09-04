"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Inbox,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Lock,
  Sparkles,
  ShieldCheck,
  X,
  Send,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type AdminCreado = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
};

type Solicitud = {
  id: string;
  nombrePredio: string;
  nombreContacto: string;
  telefono: string;
  email: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  motivoRechazo: string | null;
  adminCreadoId: string | null;
  adminCreado: AdminCreado | null;
  fechaResolucion: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
};

type CredencialesAprobacion = {
  email: string;
  password: string;
  nombre: string;
  predio: string;
  telefono: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function limpiarTelefono(tel: string): string {
  // Remueve cualquier caracter que no sea número
  const nums = tel.replace(/\D/g, "");
  // Si empieza con 0 o no tiene código de país, ajustamos si es Argentina
  if (nums.startsWith("549") || nums.startsWith("54")) return nums;
  if (nums.startsWith("15")) return `549${nums.slice(2)}`;
  return `549${nums}`;
}

export default function SuperAdminSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0 });
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendiente" | "aprobada" | "rechazada">("todas");

  // Modales
  const [modalAprobar, setModalAprobar] = useState<{ abierto: boolean; solicitud: Solicitud | null }>({
    abierto: false,
    solicitud: null,
  });
  const [passwordPersonalizada, setPasswordPersonalizada] = useState("");
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);

  const [modalRechazar, setModalRechazar] = useState<{ abierto: boolean; solicitud: Solicitud | null }>({
    abierto: false,
    solicitud: null,
  });
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

  // Modal credenciales resultantes tras aprobar
  const [modalCredenciales, setModalCredenciales] = useState<{
    abierto: boolean;
    datos: CredencialesAprobacion | null;
  }>({ abierto: false, datos: null });
  const [copiadoPass, setCopiadoPass] = useState(false);
  const [copiadoEmail, setCopiadoEmail] = useState(false);

  // ── Fetch de datos ──
  const fetchSolicitudes = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/super-admin/solicitudes");
      if (!res.ok) throw new Error("Error al cargar solicitudes");
      const data = await res.json();
      setSolicitudes(data.solicitudes ?? []);
      setStats(data.stats ?? { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // ── Filtrado ──
  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((s) => {
      if (filtroEstado !== "todas" && s.estado !== filtroEstado) return false;
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return (
        s.nombrePredio.toLowerCase().includes(q) ||
        s.nombreContacto.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.telefono.includes(q)
      );
    });
  }, [solicitudes, filtroEstado, busqueda]);

  // ── Acciones de Aprobación ──
  const handleAprobar = async () => {
    if (!modalAprobar.solicitud) return;
    setProcesandoAprobacion(true);

    try {
      const res = await fetch(`/api/super-admin/solicitudes/${modalAprobar.solicitud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "aprobar",
          passwordPersonalizada: passwordPersonalizada.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo aprobar la solicitud");
        return;
      }

      setModalAprobar({ abierto: false, solicitud: null });
      setPasswordPersonalizada("");
      setModalCredenciales({ abierto: true, datos: data.credenciales });
      fetchSolicitudes();
    } catch (err) {
      console.error(err);
      alert("Error al procesar la aprobación");
    } finally {
      setProcesandoAprobacion(false);
    }
  };

  // ── Acciones de Rechazo ──
  const handleRechazar = async () => {
    if (!modalRechazar.solicitud) return;
    setProcesandoRechazo(true);

    try {
      const res = await fetch(`/api/super-admin/solicitudes/${modalRechazar.solicitud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "rechazar",
          motivoRechazo: motivoRechazo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "No se pudo rechazar la solicitud");
        return;
      }

      setModalRechazar({ abierto: false, solicitud: null });
      setMotivoRechazo("");
      fetchSolicitudes();
    } catch (err) {
      console.error(err);
      alert("Error al procesar el rechazo");
    } finally {
      setProcesandoRechazo(false);
    }
  };

  // ── Helpers WhatsApp ──
  const armarLinkWhatsApp = (datos: CredencialesAprobacion) => {
    const tel = limpiarTelefono(datos.telefono);
    const mensaje = encodeURIComponent(
      `¡Hola ${datos.nombre}! 👋\n\n` +
      `Te damos la bienvenida a *PicaditoYa*. Tu solicitud para registrar *${datos.predio}* fue *aprobada* con éxito. 🎉\n\n` +
      `Ya tenés habilitado tu usuario Administrador con el Plan Free de prueba de 7 días. Podés ingresar a tu panel de control desde acá:\n` +
      `🔗 https://picaditoya.com/auth/login\n\n` +
      `*Tus datos de acceso:*\n` +
      `👤 *Email:* ${datos.email}\n` +
      `🔑 *Contraseña:* ${datos.password}\n\n` +
      `Ante cualquier consulta, estamos a tu disposición. ¡Muchos éxitos!`
    );
    return `https://wa.me/${tel}?text=${mensaje}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-violet-400">
              Gestión de Altas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">
            Solicitudes de Canchas
          </h1>
          <p className="text-sm text-white/50">
            Revisá y aprobá a los nuevos complejos y administradores que quieren sumarse a la plataforma.
          </p>
        </div>

        <button
          onClick={fetchSolicitudes}
          disabled={cargando}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-violet-400" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Total</span>
            <Inbox className="w-4 h-4 text-white/30" />
          </div>
          <p className="text-3xl font-black text-white">{stats.total}</p>
          <span className="text-[11px] text-white/40 mt-1 block">Recibidas en la plataforma</span>
        </div>

        {/* Pendientes */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 relative overflow-hidden backdrop-blur-sm shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Pendientes</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-amber-300">{stats.pendientes}</p>
          <span className="text-[11px] text-amber-300/60 mt-1 block">Requieren tu atención</span>
        </div>

        {/* Aprobadas */}
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Aprobadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-300">{stats.aprobadas}</p>
          <span className="text-[11px] text-emerald-300/60 mt-1 block">Admins dados de alta</span>
        </div>

        {/* Rechazadas */}
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">Rechazadas</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-300">{stats.rechazadas}</p>
          <span className="text-[11px] text-red-300/60 mt-1 block">Desestimadas</span>
        </div>
      </div>

      {/* ── CONTROLES Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
        {/* Pestañas de Estado */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl overflow-x-auto">
          {(
            [
              { key: "todas", label: "Todas", count: stats.total },
              { key: "pendiente", label: "Pendientes", count: stats.pendientes },
              { key: "aprobada", label: "Aprobadas", count: stats.aprobadas },
              { key: "rechazada", label: "Rechazadas", count: stats.rechazadas },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFiltroEstado(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroEstado === tab.key
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filtroEstado === tab.key ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative min-w-[260px] sm:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por predio, encargado o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* ── LISTADO DE SOLICITUDES ── */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-3" />
          <p className="text-white/50 text-sm">Cargando solicitudes...</p>
        </div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-white/[0.02] border border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No hay solicitudes encontradas</h3>
          <p className="text-xs text-white/40 max-w-sm text-balance">
            {busqueda
              ? "No encontramos solicitudes que coincidan con los filtros de búsqueda."
              : "Cuando un predio complete el formulario de registro, aparecerá en esta lista."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {solicitudesFiltradas.map((s) => {
            const esPendiente = s.estado === "pendiente";
            const esAprobada = s.estado === "aprobada";
            const esRechazada = s.estado === "rechazada";
            const telLimpio = limpiarTelefono(s.telefono);

            return (
              <div
                key={s.id}
                className={`p-5 sm:p-6 rounded-3xl transition-all relative overflow-hidden backdrop-blur-sm border ${
                  esPendiente
                    ? "bg-[#11161d]/80 border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.05)]"
                    : esAprobada
                    ? "bg-white/[0.02] border-emerald-500/20 hover:border-emerald-500/35"
                    : "bg-white/[0.01] border-white/5 opacity-75"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Info Principal */}
                  <div className="flex-1 space-y-3">
                    {/* Header de la tarjeta */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-violet-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">
                          {s.nombrePredio}
                        </h2>
                      </div>

                      {/* Badge de Estado */}
                      {esPendiente && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pendiente de Revisión
                        </span>
                      )}
                      {esAprobada && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Aprobada
                        </span>
                      )}
                      {esRechazada && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          Rechazada
                        </span>
                      )}

                      <span className="text-xs text-white/40 flex items-center gap-1 ml-auto lg:ml-0">
                        <Calendar className="w-3 h-3" />
                        {formatFecha(s.createdAt)}
                      </span>
                    </div>

                    {/* Datos de Contacto */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Encargado */}
                      <div className="flex items-center gap-2.5 text-xs text-white/70">
                        <User className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 leading-none mb-0.5">Encargado</p>
                          <p className="font-semibold text-white/90">{s.nombreContacto}</p>
                        </div>
                      </div>

                      {/* Teléfono / WhatsApp */}
                      <div className="flex items-center gap-2.5 text-xs text-white/70">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 leading-none mb-0.5">Teléfono</p>
                          <a
                            href={`https://wa.me/${telLimpio}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
                          >
                            {s.telefono}
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-2.5 text-xs text-white/70">
                        <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/40 leading-none mb-0.5">Email</p>
                          <a
                            href={`mailto:${s.email}`}
                            className="font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                          >
                            {s.email}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Notas / Datos de resolución si ya no es pendiente */}
                    {esAprobada && s.adminCreado && (
                      <div className="mt-2 text-xs bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-300/80">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Usuario Admin creado: <strong>{s.adminCreado.email}</strong>
                          </span>
                        </div>
                        {s.fechaResolucion && (
                          <span className="text-[11px] text-emerald-400/50">
                            Aprobada el {formatFecha(s.fechaResolucion)}
                          </span>
                        )}
                      </div>
                    )}

                    {esRechazada && s.motivoRechazo && (
                      <div className="mt-2 text-xs bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-red-300/80">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>
                            Motivo: <em>"{s.motivoRechazo}"</em>
                          </span>
                        </div>
                        {s.fechaResolucion && (
                          <span className="text-[11px] text-red-400/50">
                            Rechazada el {formatFecha(s.fechaResolucion)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción para Pendientes */}
                  {esPendiente && (
                    <div className="flex items-center sm:self-center gap-2.5 pt-2 lg:pt-0 shrink-0 border-t lg:border-t-0 border-white/10">
                      <button
                        onClick={() => setModalAprobar({ abierto: true, solicitud: s })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aceptar Solicitud
                      </button>

                      <button
                        onClick={() => setModalRechazar({ abierto: true, solicitud: s })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-bold transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CONFIRMAR APROBACIÓN ── */}
      {modalAprobar.abierto && modalAprobar.solicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0e141a] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[90px] pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aprobar Solicitud</h3>
                  <p className="text-xs text-white/50">{modalAprobar.solicitud.nombrePredio}</p>
                </div>
              </div>
              <button
                onClick={() => setModalAprobar({ abierto: false, solicitud: null })}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Encargado:</span>
                <span className="font-semibold text-white">{modalAprobar.solicitud.nombreContacto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Email de acceso:</span>
                <span className="font-semibold text-emerald-300">{modalAprobar.solicitud.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Teléfono:</span>
                <span className="font-semibold text-white">{modalAprobar.solicitud.telefono}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Plan asignado:</span>
                <span className="font-semibold text-violet-300">Free (7 días de prueba)</span>
              </div>
            </div>

            {/* Contraseña opcional o autogenerada */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 block">
                Contraseña para la cuenta (Opcional)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Dejar vacío para autogenerar contraseña segura"
                  value={passwordPersonalizada}
                  onChange={(e) => setPasswordPersonalizada(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-white/40">
                Si no ingresás una contraseña, el sistema generará una aleatoria legible automáticamente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalAprobar({ abierto: false, solicitud: null })}
                disabled={procesandoAprobacion}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAprobar}
                disabled={procesandoAprobacion}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {procesandoAprobacion ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando Admin...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar y Crear Admin
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR RECHAZO ── */}
      {modalRechazar.abierto && modalRechazar.solicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0e141a] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Rechazar Solicitud</h3>
                  <p className="text-xs text-white/50">{modalRechazar.solicitud.nombrePredio}</p>
                </div>
              </div>
              <button
                onClick={() => setModalRechazar({ abierto: false, solicitud: null })}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 block">
                Motivo del rechazo (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ej. Datos de contacto incompletos, zona fuera de cobertura..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalRechazar({ abierto: false, solicitud: null })}
                disabled={procesandoRechazo}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRechazar}
                disabled={procesandoRechazo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {procesandoRechazo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Rechazar Solicitud
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREDENCIALES LISTAS Y BOTÓN WHATSAPP ── */}
      {modalCredenciales.abierto && modalCredenciales.datos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0e1713] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] space-y-6 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/15 blur-[100px] pointer-events-none" />

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                ¡Solicitud Aprobada!
              </h3>
              <p className="text-xs text-white/60 max-w-xs mx-auto text-balance">
                El usuario administrador para <strong>{modalCredenciales.datos.predio}</strong> fue dado de alta con éxito.
              </p>
            </div>

            {/* Tarjeta de Credenciales */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 backdrop-blur-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                  Correo Electrónico (Usuario)
                </span>
                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3.5 py-2.5">
                  <span className="text-xs font-mono font-bold text-white select-all">
                    {modalCredenciales.datos.email}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(modalCredenciales.datos!.email);
                      setCopiadoEmail(true);
                      setTimeout(() => setCopiadoEmail(false), 2000);
                    }}
                    className="text-white/40 hover:text-emerald-400 transition-colors p-1"
                    title="Copiar email"
                  >
                    {copiadoEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                  Contraseña Temporal
                </span>
                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3.5 py-2.5">
                  <span className="text-sm font-mono font-black text-emerald-400 select-all tracking-wider">
                    {modalCredenciales.datos.password}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(modalCredenciales.datos!.password);
                      setCopiadoPass(true);
                      setTimeout(() => setCopiadoPass(false), 2000);
                    }}
                    className="text-white/40 hover:text-emerald-400 transition-colors p-1"
                    title="Copiar contraseña"
                  >
                    {copiadoPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón WhatsApp de Acción Directa */}
            <div className="space-y-3">
              <a
                href={armarLinkWhatsApp(modalCredenciales.datos)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-[#072412] font-black text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(37,211,102,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                Enviar Credenciales por WhatsApp
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => setModalCredenciales({ abierto: false, datos: null })}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all text-center"
              >
                Listo, cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
