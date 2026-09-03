"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Building2,
  CircleDot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  X,
  Lock,
  Eye,
  EyeOff,
  User,
  CreditCard,
  Tag,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type UltimoPago = {
  estado: string;
  mesCorrespondiente: string;
  monto: number;
  fechaPago: string | null;
};

type Predio = {
  id: string;
  nombre: string;
  estado: string;
  canchas: { id: string }[];
};

type Plan = {
  id: string;
  nombre: string;
  maxPredios: number;
  precioMensual: number;
  activo: boolean;
};

type Admin = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email: string;
  telefono: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaVencimientoSuscripcion: string | null;
  planMembresia: Plan | null;
  predioAdminDe: Predio[];
  pagosAbono: UltimoPago[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function estadoPagoLabel(pago: UltimoPago | undefined) {
  if (!pago) return { label: "Sin pagos", color: "text-white/40", bg: "bg-white/5 border-white/10" };
  if (pago.estado === "pagado")
    return { label: "Al día", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" };
  return { label: "Pendiente", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/30" };
}

function estadoPredioLabel(estado: string) {
  if (estado === "activo")
    return { label: "Activo", color: "text-emerald-300", dot: "bg-emerald-400" };
  if (estado === "inactivo")
    return { label: "Inactivo", color: "text-red-300", dot: "bg-red-400" };
  return { label: "Pend. Pago", color: "text-amber-300", dot: "bg-amber-400" };
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  // Modal crear admin
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Modal asignar plan
  const [modalPlan, setModalPlan] = useState<{ abierto: boolean; adminId: string | null; adminNombre: string }>({ abierto: false, adminId: null, adminNombre: "" });
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planSeleccionado, setPlanSeleccionado] = useState<string>("");
  const [asignando, setAsignando] = useState(false);

  const resetModal = () => {
    setFormNombre(""); setFormApellido(""); setFormEmail(""); setFormPassword("");
    setErrorModal(null); setShowPass(false);
  };

  const fetchAdmins = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/admins");
      if (!res.ok) throw new Error("Error al cargar admins");
      const data = await res.json();
      setAdmins(data.admins);
    } catch {
      setError("No se pudo cargar la lista de administradores.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    // Cargar planes para el modal de asignación
    fetch("/api/super-admin/planes").then(r => r.json()).then(d => setPlanes(d.planes ?? []));
  }, [fetchAdmins]);

  const abrirModalPlan = (admin: Admin) => {
    setPlanSeleccionado(admin.planMembresia?.id ?? "");
    setModalPlan({ abierto: true, adminId: admin.id, adminNombre: admin.nombre });
  };

  const asignarPlan = async () => {
    if (!modalPlan.adminId) return;
    setAsignando(true);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: modalPlan.adminId, accion: "asignar_plan", planId: planSeleccionado }),
      });
      if (!res.ok) throw new Error();
      setModalPlan({ abierto: false, adminId: null, adminNombre: "" });
      fetchAdmins();
    } catch {
      alert("No se pudo asignar el plan.");
    } finally {
      setAsignando(false);
    }
  };

  const toggleAdmin = async (adminId: string, estaActivo: boolean) => {
    const accion = estaActivo ? "deshabilitar" : "habilitar";
    setCambiando(adminId);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, accion }),
      });
      if (!res.ok) throw new Error();
      await fetchAdmins();
    } catch {
      alert("No se pudo cambiar el estado. Intentá de nuevo.");
    } finally {
      setCambiando(null);
    }
  };

  const crearAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setCreando(true);
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: formNombre, apellido: formApellido, email: formEmail, password: formPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorModal(data.error ?? "Error al crear el admin."); return; }
      setModalAbierto(false);
      resetModal();
      await fetchAdmins();
    } catch {
      setErrorModal("Error inesperado. Intentá de nuevo.");
    } finally {
      setCreando(false);
    }
  };

  const totalPredios = admins.reduce((sum, a) => sum + a.predioAdminDe.length, 0);
  const totalCanchas = admins.reduce(
    (sum, a) => sum + a.predioAdminDe.reduce((s, p) => s + p.canchas.length, 0),
    0
  );
  const adminsConDeuda = admins.filter((a) =>
    !a.fechaVencimientoSuscripcion || new Date(a.fechaVencimientoSuscripcion) < new Date()
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Super Admin</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-wide">
            Gestión de Admins
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">
            Visualizá y gestioná las cuentas de todos los administradores de complejos.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => { resetModal(); setModalAbierto(true); }}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Admin
          </button>
          <button
            onClick={fetchAdmins}
            disabled={cargando}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Admins totales", value: admins.length, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
          { label: "Predios activos", value: totalPredios, icon: Building2, color: "text-brand", bg: "bg-brand/10 border-brand/20" },
          { label: "Canchas en total", value: totalCanchas, icon: CircleDot, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Con deuda", value: adminsConDeuda, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-5 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${kpi.bg}`}>
              <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
            </div>
            <div>
              <span className={`text-3xl font-display font-black ${kpi.color}`}>{kpi.value}</span>
              <p className="text-xs text-white/50 mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONTENT ── */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-white/50 text-sm">Cargando administradores...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">
          <XCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <Users className="w-12 h-12 text-white/20" />
          <p className="text-white/50 text-sm">No hay administradores registrados todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => {
            const totalCanchasAdmin = admin.predioAdminDe.reduce((s, p) => s + p.canchas.length, 0);
            const ultimoPago = admin.pagosAbono[0];
            const pagoInfo = estadoPagoLabel(ultimoPago);
            const vencido = admin.fechaVencimientoSuscripcion && new Date(admin.fechaVencimientoSuscripcion) < new Date();
            const diasRestantes = admin.fechaVencimientoSuscripcion
              ? Math.ceil((new Date(admin.fechaVencimientoSuscripcion).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : null;
            const isExpanded = expandido === admin.id;
            const isCambiando = cambiando === admin.id;
            const diasAntiguedad = Math.floor(
              (new Date().getTime() - new Date(admin.fechaCreacion).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={admin.id}
                className="bg-[#0f1712]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all"
              >
                {/* ── Fila principal ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6">

                  {/* Info con Avatar */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                      <span className="text-violet-300 font-black text-sm sm:text-base">
                        {admin.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h2 className="font-bold text-white text-sm sm:text-base break-words">
                          {admin.nombre} {admin.apellido ?? ""}
                        </h2>
                        {/* Badge plan */}
                        {admin.planMembresia ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/25 text-violet-300">
                            Plan {admin.planMembresia.nombre}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-white/40">
                            Sin plan
                          </span>
                        )}
                        {/* Badge vencimiento */}
                        {vencido ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-500/10 border-red-500/25 text-red-400">
                            Vencido
                          </span>
                        ) : null}
                        {/* Badge deshabilitado */}
                        {admin.activo === false && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-500/20 border-red-500/40 text-red-300">
                            Deshabilitado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 mt-1.5 text-xs text-white/50">
                        <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                          <Mail className="w-3 h-3 shrink-0" /> {admin.email}
                        </span>
                        {admin.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {admin.telefono}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-white/40">
                          <Calendar className="w-3 h-3 shrink-0" /> {formatFecha(admin.fechaCreacion)}
                        </span>
                        <span className="text-amber-400/90 font-semibold">
                          &bull; {diasAntiguedad}d antigüedad
                        </span>
                        {/* Días restantes del plan */}
                        {diasRestantes !== null ? (
                          <span className={`font-black ${
                            diasRestantes <= 0 ? "text-red-400" :
                            diasRestantes <= 5 ? "text-amber-400" :
                            "text-emerald-400"
                          }`}>
                            &bull; {diasRestantes <= 0 ? "Vencido" : `${diasRestantes}d restantes`}
                          </span>
                        ) : (
                          <span className="font-bold text-white/30">&bull; Sin vencimiento</span>
                        )}
                      </div>

                      {/* Mini stats en móvil */}
                      <div className="flex sm:hidden items-center gap-2 mt-2 pt-2 border-t border-white/5">
                        <span className="text-[11px] font-semibold text-white/70 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-brand" /> {admin.predioAdminDe.length} {admin.predioAdminDe.length === 1 ? "predio" : "predios"}
                        </span>
                        <span className="text-[11px] font-semibold text-white/70 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <CircleDot className="w-3 h-3 text-blue-400" /> {totalCanchasAdmin} {totalCanchasAdmin === 1 ? "cancha" : "canchas"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats desktop + Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                    {/* Stats en Desktop */}
                    <div className="text-center hidden sm:block px-2">
                      <span className="text-base sm:text-lg font-display font-black text-white">{admin.predioAdminDe.length}</span>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Predios</p>
                    </div>
                    <div className="text-center hidden sm:block px-2">
                      <span className="text-base sm:text-lg font-display font-black text-white">{totalCanchasAdmin}</span>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Canchas</p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => abrirModalPlan(admin)}
                        title="Asignar plan de membresía"
                        className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
                      >
                        <Tag className="w-3.5 h-3.5" /> Plan
                      </button>

                      <button
                        onClick={() => toggleAdmin(admin.id, admin.activo !== false)}
                        disabled={isCambiando}
                        title={admin.activo !== false ? "Deshabilitar cuenta del administrador" : "Habilitar cuenta del administrador"}
                        className={`flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                          admin.activo !== false
                            ? "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isCambiando ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : admin.activo !== false ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{admin.activo !== false ? "Deshabilitar" : "Habilitar"}</span>
                      </button>

                      {admin.predioAdminDe.length > 0 && (
                        <button
                          onClick={() => setExpandido(isExpanded ? null : admin.id)}
                          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                          title="Ver detalle de predios"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Detalle expandible: predios ── */}
                {isExpanded && admin.predioAdminDe.length > 0 && (
                  <div className="border-t border-white/10 px-5 sm:px-6 py-4 space-y-3 bg-white/[0.02]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                      Predios del administrador
                    </p>
                    {admin.predioAdminDe.map((predio) => {
                      const estadoInfo = estadoPredioLabel(predio.estado);

                      return (
                        <div key={predio.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${estadoInfo.dot} shrink-0`} />
                            <div>
                              <p className="text-sm font-bold text-white">{predio.nombre}</p>
                              <p className="text-xs text-white/40">{predio.canchas.length} {predio.canchas.length === 1 ? "cancha" : "canchas"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${estadoInfo.color} ${predio.estado === "activo" ? "bg-emerald-500/10 border-emerald-500/25" : "bg-red-500/10 border-red-500/25"}`}>
                              {estadoInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CREAR ADMIN ── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f1712]/98 border border-white/15 rounded-2xl sm:rounded-[2rem] w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Super Admin</p>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Crear nuevo Admin</h2>
              </div>
              <button onClick={() => { setModalAbierto(false); resetModal(); }} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={crearAdmin} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {errorModal && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                  <XCircle className="w-4 h-4 shrink-0" />{errorModal}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60">Nombre *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input type="text" required placeholder="Juan" value={formNombre} onChange={e => setFormNombre(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/60">Apellido</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <input type="text" placeholder="Pérez" value={formApellido} onChange={e => setFormApellido(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/60">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input type="email" required placeholder="admin@complejo.com" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/60">Contraseña temporal *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input type={showPass ? "text" : "password"} required minLength={8} placeholder="Mínimo 8 caracteres" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-white/30 ml-1">El admin la puede cambiar luego desde su perfil.</p>
              </div>

              <button type="submit" disabled={creando}
                className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-2">
                {creando ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : <><Plus className="w-4 h-4" /> Crear Admin</>}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL ASIGNAR PLAN ── */}
      {modalPlan.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#0f1712] border border-white/10 rounded-2xl sm:rounded-[2rem] w-full max-w-sm max-h-[92vh] flex flex-col shadow-2xl p-5 sm:p-6 overflow-hidden">
            <h3 className="text-lg font-black text-white uppercase tracking-wide mb-1 shrink-0">Asignar Plan</h3>
            <p className="text-white/50 text-xs sm:text-sm mb-4 shrink-0 truncate">{modalPlan.adminNombre}</p>
            <div className="space-y-2 mb-5 overflow-y-auto pr-1">
              <button
                onClick={() => setPlanSeleccionado("")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  planSeleccionado === "" ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
                }`}
              >
                <span className="text-sm font-bold">Sin plan</span>
                {planSeleccionado === "" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
              {planes.filter(p => p.activo).map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setPlanSeleccionado(plan.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    planSeleccionado === plan.id ? "border-violet-500/50 bg-violet-500/15 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-bold">{plan.nombre}</p>
                    <p className="text-xs text-white/40">Hasta {plan.maxPredios} predio(s) &bull; ${plan.precioMensual.toLocaleString("es-AR")}/mes</p>
                  </div>
                  {planSeleccionado === plan.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3 shrink-0 pt-2 border-t border-white/5">
              <button onClick={() => setModalPlan({ abierto: false, adminId: null, adminNombre: "" })} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 font-bold hover:bg-white/5 transition-all text-xs sm:text-sm">Cancelar</button>
              <button onClick={asignarPlan} disabled={asignando} className="flex-1 px-4 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-black transition-all flex justify-center items-center text-xs sm:text-sm">
                {asignando ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
