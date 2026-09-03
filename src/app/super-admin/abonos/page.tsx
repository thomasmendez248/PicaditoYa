"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CreditCard, Calendar, AlertTriangle,
  Loader2, RefreshCw, Plus, CheckCircle2,
  Receipt, Search, DollarSign, ShieldCheck,
  Pencil, Trash2, XCircle,
} from "lucide-react";

type Plan = {
  id: string;
  nombre: string;
  precioMensual: number;
  maxPredios: number;
};

type Predio = { id: string; nombre: string; estado: string };

type Admin = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  fechaVencimientoSuscripcion: string | null;
  planMembresia: Plan | null;
  predioAdminDe: Predio[];
};

type PagoHistorial = {
  id: string;
  adminId: string;
  planId: string | null;
  monto: number;
  estado: string;
  fechaPago: string | null;
  diasSumados: number;
  createdAt: string;
  admin: {
    id: string;
    nombre: string;
    apellido: string | null;
    email: string;
  };
  plan: {
    id: string;
    nombre: string;
    precioMensual: number;
  } | null;
};

export default function SuperAdminAbonosPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [pagos, setPagos] = useState<PagoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal registrar pago
  const [modalPago, setModalPago] = useState<{
    abierto: boolean;
    adminId: string;
    planId: string;
    monto: string;
    fechaPago: string;
    diasAdicionales: string;
  }>({
    abierto: false,
    adminId: "",
    planId: "",
    monto: "",
    fechaPago: new Date().toISOString().split("T")[0],
    diasAdicionales: "30",
  });

  // Modal editar pago
  const [modalEditar, setModalEditar] = useState<{
    abierto: boolean;
    pagoId: string;
    adminNombre: string;
    adminEmail: string;
    planId: string;
    monto: string;
    fechaPago: string;
    diasSumados: string;
    estado: string;
  }>({
    abierto: false,
    pagoId: "",
    adminNombre: "",
    adminEmail: "",
    planId: "",
    monto: "",
    fechaPago: "",
    diasSumados: "30",
    estado: "pagado",
  });

  // Filtro para el historial
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const fetchDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/abonos");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmins(data.admins || []);
      setPlanes(data.planes || []);
      setPagos(data.pagos || []);
    } catch {
      setError("No se pudo cargar la información de abonos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // Abrir modal de registrar pago
  const abrirModalPago = (adminId?: string) => {
    const hoy = new Date().toISOString().split("T")[0];
    const targetAdmin = admins.find(a => a.id === adminId) || admins[0];
    const targetPlan = targetAdmin?.planMembresia || planes[0];

    setModalPago({
      abierto: true,
      adminId: targetAdmin ? targetAdmin.id : "",
      planId: targetPlan ? targetPlan.id : "",
      monto: targetPlan ? targetPlan.precioMensual.toString() : "0",
      fechaPago: hoy,
      diasAdicionales: "30",
    });
  };

  // Abrir modal de editar pago
  const abrirModalEditar = (pago: PagoHistorial) => {
    const fechaStr = pago.fechaPago
      ? new Date(pago.fechaPago).toISOString().split("T")[0]
      : new Date(pago.createdAt).toISOString().split("T")[0];

    setModalEditar({
      abierto: true,
      pagoId: pago.id,
      adminNombre: `${pago.admin.nombre} ${pago.admin.apellido ?? ""}`.trim(),
      adminEmail: pago.admin.email,
      planId: pago.planId || "",
      monto: pago.monto.toString(),
      fechaPago: fechaStr,
      diasSumados: (pago.diasSumados || 30).toString(),
      estado: pago.estado || "pagado",
    });
  };

  // Manejar cambio de admin en el modal nuevo pago
  const handleAdminChangeInModal = (selectedAdminId: string) => {
    const adminSelected = admins.find(a => a.id === selectedAdminId);
    const plan = adminSelected?.planMembresia || planes.find(p => p.id === modalPago.planId) || planes[0];
    setModalPago(prev => ({
      ...prev,
      adminId: selectedAdminId,
      planId: plan ? plan.id : prev.planId,
      monto: plan ? plan.precioMensual.toString() : prev.monto,
    }));
  };

  // Manejar cambio de plan en el modal nuevo pago
  const handlePlanChangeInModal = (selectedPlanId: string) => {
    const planSelected = planes.find(p => p.id === selectedPlanId);
    setModalPago(prev => ({
      ...prev,
      planId: selectedPlanId,
      monto: planSelected ? planSelected.precioMensual.toString() : prev.monto,
    }));
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPago.adminId) {
      alert("Selecciona un administrador");
      return;
    }
    const montoNum = parseFloat(modalPago.monto);
    if (isNaN(montoNum) || montoNum < 0) {
      alert("Ingresa un monto válido");
      return;
    }

    setProcesando(true);
    try {
      const res = await fetch("/api/super-admin/abonos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: modalPago.adminId,
          planId: modalPago.planId || undefined,
          monto: montoNum,
          fechaPago: modalPago.fechaPago,
          diasAdicionales: parseInt(modalPago.diasAdicionales, 10) || 30,
        }),
      });
      if (!res.ok) throw new Error();
      setModalPago(prev => ({ ...prev, abierto: false }));
      await fetchDatos();
    } catch {
      alert("Error al registrar el pago. Verifica los datos e intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
  };

  const guardarEdicionPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar.pagoId) return;

    const montoNum = parseFloat(modalEditar.monto);
    if (isNaN(montoNum) || montoNum < 0) {
      alert("Ingresa un monto válido");
      return;
    }

    setProcesando(true);
    try {
      const res = await fetch("/api/super-admin/abonos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modalEditar.pagoId,
          planId: modalEditar.planId || null,
          monto: montoNum,
          fechaPago: modalEditar.fechaPago,
          diasSumados: parseInt(modalEditar.diasSumados, 10) || 30,
          estado: modalEditar.estado,
        }),
      });

      if (!res.ok) throw new Error();
      setModalEditar(prev => ({ ...prev, abierto: false }));
      await fetchDatos();
    } catch {
      alert("Error al actualizar el pago. Intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarPago = async (pago: PagoHistorial) => {
    const confirmado = confirm(
      `¿Estás seguro de eliminar el pago de $${pago.monto.toLocaleString("es-AR")} de ${pago.admin.nombre}?\n\nAl eliminarlo, se restarán los días otorgados y se recalculará automáticamente la fecha de vencimiento del administrador.`
    );
    if (!confirmado) return;

    setEliminandoId(pago.id);
    try {
      const res = await fetch(`/api/super-admin/abonos?id=${pago.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await fetchDatos();
    } catch {
      alert("Error al eliminar el pago.");
    } finally {
      setEliminandoId(null);
    }
  };

  // Historial filtrado
  const pagosFiltrados = useMemo(() => {
    if (!busquedaHistorial.trim()) return pagos;
    const q = busquedaHistorial.toLowerCase();
    return pagos.filter(p =>
      p.admin.nombre.toLowerCase().includes(q) ||
      (p.admin.apellido && p.admin.apellido.toLowerCase().includes(q)) ||
      p.admin.email.toLowerCase().includes(q) ||
      (p.plan && p.plan.nombre.toLowerCase().includes(q))
    );
  }, [pagos, busquedaHistorial]);

  // Métricas
  const metricas = useMemo(() => {
    const totalRecaudado = pagos.filter(p => p.estado === "pagado").reduce((acc, p) => acc + p.monto, 0);
    const ahora = new Date();
    const adminsActivos = admins.filter(a => a.fechaVencimientoSuscripcion && new Date(a.fechaVencimientoSuscripcion) > ahora).length;
    const adminsBloqueados = admins.length - adminsActivos;
    return { totalRecaudado, adminsActivos, adminsBloqueados, totalPagos: pagos.length };
  }, [pagos, admins]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">Membresías</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-wide">Abonos SaaS</h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">Control de cobros, registro y gestión de pagos por administrador.</p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchDatos}
            disabled={cargando}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button
            onClick={() => abrirModalPago()}
            disabled={admins.length === 0}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
          >
            <Plus className="w-4 h-4" /> Registrar Pago
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0f1712]/70 border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40">Total Recaudado</span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 mt-1">
            ${metricas.totalRecaudado.toLocaleString("es-AR")}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/30 mt-1 flex items-center gap-1">
            <Receipt className="w-3 h-3" /> {metricas.totalPagos} pagos registrados
          </span>
        </div>

        <div className="bg-[#0f1712]/70 border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40">Admins Al Día</span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-400 mt-1">
            {metricas.adminsActivos}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400/60 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Suscripción activa
          </span>
        </div>

        <div className="bg-[#0f1712]/70 border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40">Admins Vencidos</span>
          <span className={`text-xl sm:text-2xl lg:text-3xl font-black mt-1 ${metricas.adminsBloqueados > 0 ? "text-red-400" : "text-white/40"}`}>
            {metricas.adminsBloqueados}
          </span>
          <span className="text-[10px] sm:text-[11px] text-red-400/60 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Predios bloqueados
          </span>
        </div>

        <div className="bg-[#0f1712]/70 border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/40">Planes Activos</span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1">
            {planes.length}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/30 mt-1">Disponibles en el SaaS</span>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : error ? (
        <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">
          {error}
        </div>
      ) : (
        /* Historial de Pagos Registrados */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" /> Historial de Pagos Registrados
              </h2>
              <p className="text-white/40 text-xs mt-0.5">Cobros registrados, edición y sincronización automática de días y vencimientos.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por admin o plan..."
                value={busquedaHistorial}
                onChange={e => setBusquedaHistorial(e.target.value)}
                className="w-full bg-[#0f1712] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {pagosFiltrados.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-[#0f1712]/40 rounded-2xl border border-white/5">
              <Receipt className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm font-medium">
                {busquedaHistorial ? "No se encontraron pagos con ese filtro." : "Aún no se ha registrado ningún pago."}
              </p>
              {!busquedaHistorial && (
                <button
                  onClick={() => abrirModalPago()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Primer Pago
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── Vista Tabla para Desktop (md+) ── */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-[#0f1712]/60 backdrop-blur-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Fecha Pago</th>
                      <th className="py-3.5 px-4">Administrador</th>
                      <th className="py-3.5 px-4">Plan</th>
                      <th className="py-3.5 px-4">Monto Cobrado</th>
                      <th className="py-3.5 px-4">Días Otorgados</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pagosFiltrados.map(pago => {
                      const fechaDisplay = pago.fechaPago || pago.createdAt;
                      const estaEliminando = eliminandoId === pago.id;

                      return (
                        <tr key={pago.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-white/40" />
                              <span className="text-white font-medium">
                                {new Date(fechaDisplay).toLocaleDateString("es-AR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">
                              {pago.admin.nombre} {pago.admin.apellido ?? ""}
                            </div>
                            <div className="text-white/40 text-[11px]">{pago.admin.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {pago.plan ? (
                              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300">
                                Plan {pago.plan.nombre}
                              </span>
                            ) : (
                              <span className="text-white/40 text-[11px]">SaaS General</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-sm font-black text-emerald-400">
                              ${pago.monto.toLocaleString("es-AR")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 font-semibold">
                              +{pago.diasSumados} días
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              pago.estado === "pagado"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : pago.estado === "pendiente"
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : "bg-red-500/15 border-red-500/30 text-red-400"
                            }`}>
                              {pago.estado === "pagado" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              <span className="capitalize">{pago.estado}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => abrirModalEditar(pago)}
                                title="Editar pago registrado"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => eliminarPago(pago)}
                                disabled={estaEliminando}
                                title="Eliminar pago y recalcular vencimiento"
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                              >
                                {estaEliminando ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Vista Tarjetas para Móvil (md-) ── */}
              <div className="md:hidden space-y-3">
                {pagosFiltrados.map(pago => {
                  const fechaDisplay = pago.fechaPago || pago.createdAt;
                  const estaEliminando = eliminandoId === pago.id;

                  return (
                    <div key={pago.id} className="bg-[#0f1712]/80 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">{pago.admin.nombre} {pago.admin.apellido ?? ""}</p>
                          <p className="text-xs text-white/40">{pago.admin.email}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          pago.estado === "pagado"
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : pago.estado === "pendiente"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : "bg-red-500/15 border-red-500/30 text-red-400"
                        }`}>
                          {pago.estado === "pagado" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                          <span className="capitalize">{pago.estado}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1 text-white/50">
                          <Calendar className="w-3 h-3 text-white/40" />
                          <span>
                            {new Date(fechaDisplay).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {pago.plan ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300">
                            Plan {pago.plan.nombre}
                          </span>
                        ) : (
                          <span className="text-white/40 text-[11px]">SaaS General</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-emerald-400">
                            ${pago.monto.toLocaleString("es-AR")}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 font-semibold">
                            +{pago.diasSumados}d
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => abrirModalEditar(pago)}
                            title="Editar pago registrado"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => eliminarPago(pago)}
                            disabled={estaEliminando}
                            title="Eliminar pago y recalcular vencimiento"
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                          >
                            {estaEliminando ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Registrar Pago */}
      {modalPago.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0f1712] border border-white/15 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] w-full max-w-lg max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" /> Registrar Pago
                </h3>
                <p className="text-white/40 text-xs mt-0.5">Registra la entrega de dinero y renueva la suscripción del admin.</p>
              </div>
            </div>

            <form onSubmit={registrarPago} className="space-y-4 overflow-y-auto pr-1">
              {/* Seleccionar Admin */}
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Administrador
                </label>
                <select
                  required
                  value={modalPago.adminId}
                  onChange={e => handleAdminChangeInModal(e.target.value)}
                  className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                >
                  <option value="" disabled>Selecciona un administrador...</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.apellido ?? ""} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleccionar Plan */}
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Tipo de Plan
                </label>
                <select
                  value={modalPago.planId}
                  onChange={e => handlePlanChangeInModal(e.target.value)}
                  className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                >
                  <option value="">Mantener plan actual / Sin plan específico</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>
                      Plan {p.nombre} — ${p.precioMensual.toLocaleString("es-AR")}/mes (Hasta {p.maxPredios} predio{p.maxPredios > 1 ? "s" : ""})
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto y Fecha en 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Monto cobrado ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      placeholder="0"
                      value={modalPago.monto}
                      onChange={e => setModalPago(prev => ({ ...prev, monto: e.target.value }))}
                      className="w-full bg-[#16221b] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">Efectivo entregado o transferido.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Fecha del pago
                  </label>
                  <input
                    type="date"
                    required
                    value={modalPago.fechaPago}
                    onChange={e => setModalPago(prev => ({ ...prev, fechaPago: e.target.value }))}
                    className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Día en que se cobró / entregó el dinero.</p>
                </div>
              </div>

              {/* Días adicionales a sumar */}
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Días de suscripción a otorgar
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={modalPago.diasAdicionales}
                  onChange={e => setModalPago(prev => ({ ...prev, diasAdicionales: e.target.value }))}
                  className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Se extenderá la vigencia y se desbloquearán automáticamente los predios del administrador.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalPago(prev => ({ ...prev, abierto: false }))}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 font-bold transition-all hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs transition-all flex justify-center items-center shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Pago */}
      {modalEditar.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0f1712] border border-white/15 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] w-full max-w-lg max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-amber-400" /> Editar Pago Registrado
                </h3>
                <p className="text-white/50 text-xs mt-1 truncate max-w-xs sm:max-w-md">
                  Administrador: <strong className="text-white">{modalEditar.adminNombre}</strong> ({modalEditar.adminEmail})
                </p>
              </div>
            </div>

            <form onSubmit={guardarEdicionPago} className="space-y-4 overflow-y-auto pr-1">
              {/* Seleccionar Plan */}
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                  Plan Asociado
                </label>
                <select
                  value={modalEditar.planId}
                  onChange={e => setModalEditar(prev => ({ ...prev, planId: e.target.value }))}
                  className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                >
                  <option value="">Sin plan específico / SaaS General</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>
                      Plan {p.nombre} — ${p.precioMensual.toLocaleString("es-AR")}/mes
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Monto cobrado ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={modalEditar.monto}
                      onChange={e => setModalEditar(prev => ({ ...prev, monto: e.target.value }))}
                      className="w-full bg-[#16221b] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Fecha del pago
                  </label>
                  <input
                    type="date"
                    required
                    value={modalEditar.fechaPago}
                    onChange={e => setModalEditar(prev => ({ ...prev, fechaPago: e.target.value }))}
                    className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
              </div>

              {/* Días y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Días otorgados
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={modalEditar.diasSumados}
                    onChange={e => setModalEditar(prev => ({ ...prev, diasSumados: e.target.value }))}
                    className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Estado del pago
                  </label>
                  <select
                    value={modalEditar.estado}
                    onChange={e => setModalEditar(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full bg-[#16221b] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-colors"
                  >
                    <option value="pagado">Pagado (Aprobado)</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-white/40 pt-1">
                Al guardar, la fecha de vencimiento y el acceso de los predios del administrador se recalcularán automáticamente en base a este cambio.
              </p>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditar(prev => ({ ...prev, abierto: false }))}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 font-bold transition-all hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider text-xs transition-all flex justify-center items-center shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                >
                  {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
