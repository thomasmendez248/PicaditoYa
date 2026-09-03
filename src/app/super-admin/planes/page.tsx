"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard, Plus, Pencil, Trash2, Loader2,
  RefreshCw, Building2, CheckCircle2, XCircle, Users
} from "lucide-react";

type Plan = {
  id: string;
  nombre: string;
  maxPredios: number;
  precioMensual: number;
  descripcion: string | null;
  activo: boolean;
  _count: { usuarios: number };
};

const PLAN_COLORS = [
  { border: "border-slate-500/40", bg: "bg-slate-500/10", text: "text-slate-300", accent: "bg-slate-500" },
  { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-300", accent: "bg-violet-500" },
  { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300", accent: "bg-amber-500" },
  { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-300", accent: "bg-emerald-500" },
  { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-300", accent: "bg-blue-500" },
];

type ModalState = {
  abierto: boolean;
  modo: "crear" | "editar";
  plan: Plan | null;
};

export default function SuperAdminPlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ abierto: false, modo: "crear", plan: null });
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Form state
  const [fNombre, setFNombre] = useState("");
  const [fMaxPredios, setFMaxPredios] = useState("1");
  const [fPrecio, setFPrecio] = useState("");
  const [fDescripcion, setFDescripcion] = useState("");

  const fetchPlanes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/planes");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlanes(data.planes);
    } catch {
      setError("No se pudieron cargar los planes.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  const abrirCrear = () => {
    setFNombre(""); setFMaxPredios("1"); setFPrecio(""); setFDescripcion("");
    setErrorModal(null);
    setModal({ abierto: true, modo: "crear", plan: null });
  };

  const abrirEditar = (plan: Plan) => {
    setFNombre(plan.nombre);
    setFMaxPredios(String(plan.maxPredios));
    setFPrecio(String(plan.precioMensual));
    setFDescripcion(plan.descripcion ?? "");
    setErrorModal(null);
    setModal({ abierto: true, modo: "editar", plan });
  };

  const cerrarModal = () => setModal({ abierto: false, modo: "crear", plan: null });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setProcesando(true);
    try {
      const body = {
        nombre: fNombre,
        maxPredios: parseInt(fMaxPredios, 10),
        precioMensual: parseFloat(fPrecio),
        descripcion: fDescripcion || undefined,
      };

      let res: Response;
      if (modal.modo === "crear") {
        res = await fetch("/api/super-admin/planes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/super-admin/planes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: modal.plan!.id, ...body }) });
      }

      const data = await res.json();
      if (!res.ok) { setErrorModal(data.error ?? "Error al guardar"); return; }

      cerrarModal();
      fetchPlanes();
    } catch {
      setErrorModal("Error inesperado. Intentá de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const toggleActivo = async (plan: Plan) => {
    await fetch("/api/super-admin/planes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, activo: !plan.activo }),
    });
    fetchPlanes();
  };

  const eliminar = async (plan: Plan) => {
    if (plan._count.usuarios > 0) {
      alert(`No se puede eliminar: ${plan._count.usuarios} admin(s) tienen este plan.`);
      return;
    }
    if (!confirm(`¿Eliminar el plan "${plan.nombre}"?`)) return;
    await fetch(`/api/super-admin/planes?planId=${plan.id}`, { method: "DELETE" });
    fetchPlanes();
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Super Admin</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-wide">
            Planes de Membresía
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">
            Creá y editá los planes disponibles para los complejos deportivos.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button onClick={abrirCrear} className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Plus className="w-3.5 h-3.5" /> Nuevo Plan
          </button>
          <button onClick={fetchPlanes} disabled={cargando} className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* Content */}
      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : error ? (
        <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">{error}</div>
      ) : planes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <CreditCard className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/50 text-sm">No hay planes creados todavía. ¡Creá el primero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {planes.map((plan, i) => {
            const color = PLAN_COLORS[i % PLAN_COLORS.length];
            return (
              <div key={plan.id} className={`bg-[#0f1712]/80 backdrop-blur-xl border ${color.border} rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 flex flex-col gap-4 transition-all ${!plan.activo ? "opacity-50" : ""}`}>
                {/* Top row */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${color.text}`}>Plan</span>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-0.5">{plan.nombre}</h2>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => abrirEditar(plan)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => eliminar(plan)} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <span className="text-3xl sm:text-4xl font-display font-black text-white">
                    ${plan.precioMensual.toLocaleString("es-AR")}
                  </span>
                  <span className="text-white/40 text-xs sm:text-sm"> / mes</span>
                </div>

                {/* Features */}
                <div className={`${color.bg} border ${color.border} rounded-xl p-3 space-y-1.5`}>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                    <Building2 className={`w-4 h-4 ${color.text}`} />
                    Hasta <strong>{plan.maxPredios}</strong> predio{plan.maxPredios !== 1 ? "s" : ""}
                  </div>
                  {plan.descripcion && (
                    <p className="text-xs text-white/50 pt-1 border-t border-white/5">{plan.descripcion}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <Users className="w-3.5 h-3.5" /> {plan._count.usuarios} admin(s)
                  </span>
                  <button
                    onClick={() => toggleActivo(plan)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${plan.activo ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" : "border-white/10 bg-white/5 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"}`}
                  >
                    {plan.activo ? <><CheckCircle2 className="w-3.5 h-3.5" /> Activo</> : <><XCircle className="w-3.5 h-3.5" /> Inactivo</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modal.abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1712] border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide mb-4 sm:mb-6 shrink-0">
              {modal.modo === "crear" ? "Nuevo Plan" : `Editar: ${modal.plan?.nombre}`}
            </h3>
            <form onSubmit={guardar} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Nombre del Plan</label>
                <input required value={fNombre} onChange={e => setFNombre(e.target.value)}
                  placeholder="ej: Común, Plus, Enterprise"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Máx. Predios</label>
                  <input required type="number" min="1" value={fMaxPredios} onChange={e => setFMaxPredios(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Precio mensual ($)</label>
                  <input required type="number" min="0" step="100" value={fPrecio} onChange={e => setFPrecio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Descripción (opcional)</label>
                <textarea rows={2} value={fDescripcion} onChange={e => setFDescripcion(e.target.value)}
                  placeholder="ej: Ideal para complejos pequeños con 1 cancha"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
              </div>

              {errorModal && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{errorModal}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 font-bold transition-all text-xs sm:text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} className="flex-1 px-4 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-black transition-all flex justify-center items-center gap-2 text-xs sm:text-sm">
                  {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : (modal.modo === "crear" ? "Crear Plan" : "Guardar Cambios")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
