"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Phone,
  Shield,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  UserX,
  KeyRound,
  X,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export default function AdminEmpleadosPage() {
  const { selectedPredio, selectedPredioId } = useAdmin();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [maxEmpleados, setMaxEmpleados] = useState(2);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Crear
  const [modalOpen, setModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: "",
  });

  // Modal Eliminar
  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<Empleado | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchEmpleados = useCallback(async () => {
    if (!selectedPredioId) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/empleados?predioId=${selectedPredioId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al obtener empleados");
      }
      const data = await res.json();
      setEmpleados(data.empleados || []);
      if (data.maxEmpleados) setMaxEmpleados(data.maxEmpleados);
    } catch (err: any) {
      setError(err.message || "Error al cargar empleados");
    } finally {
      setCargando(false);
    }
  }, [selectedPredioId]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  const handleCrearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPredioId) return;

    setModalError(null);
    setGuardando(true);

    try {
      const res = await fetch("/api/admin/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          predioId: selectedPredioId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el empleado");
      }

      setModalOpen(false);
      setFormData({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        telefono: "",
      });
      fetchEmpleados();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!empleadoAEliminar) return;
    setEliminando(true);

    try {
      const res = await fetch(`/api/admin/empleados/${empleadoAEliminar.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar empleado");
      }

      setEmpleadoAEliminar(null);
      fetchEmpleados();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEliminando(false);
    }
  };

  const empleadosActivos = empleados.filter((e) => e.activo);
  const limiteAlcanzado = empleadosActivos.length >= maxEmpleados;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">
                Gestión de Empleados
              </h1>
              <p className="text-sm text-white/50">
                {selectedPredio ? (
                  <>
                    Complejo: <span className="text-brand font-semibold">{selectedPredio.nombre}</span>
                  </>
                ) : (
                  "Seleccioná un predio para gestionar su personal"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-right">
            <span className="text-xs text-white/40 uppercase tracking-wider block font-bold">Cupo de empleados</span>
            <span className="text-sm font-black text-white">
              <span className={limiteAlcanzado ? "text-amber-400" : "text-brand"}>
                {empleadosActivos.length}
              </span>{" "}
              / {maxEmpleados} activos
            </span>
          </div>

          <button
            onClick={() => {
              setModalError(null);
              setFormData({ nombre: "", apellido: "", email: "", password: "", telefono: "" });
              setModalOpen(true);
            }}
            disabled={limiteAlcanzado || !selectedPredioId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              limiteAlcanzado || !selectedPredioId
                ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                : "bg-brand text-surface hover:bg-brand/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(69,228,148,0.25)]"
            }`}
            title={limiteAlcanzado ? `Máximo ${maxEmpleados} empleados por complejo permitido` : undefined}
          >
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Info card permisos */}
      <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <Shield className="w-5 h-5 text-brand shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-white/70 space-y-1">
          <p className="font-semibold text-white">Permisos del rol Empleado en {selectedPredio?.nombre || "este complejo"}:</p>
          <ul className="list-disc list-inside space-y-0.5 text-white/60">
            <li>Visualizar los turnos del día y agenda de este complejo.</li>
            <li>Crear turnos manuales o para clientes.</li>
            <li>Ver el detalle del turno y <strong className="text-white">cambiar su estado</strong> (confirmado, completado, cancelado, no-show). No pueden eliminar turnos.</li>
            <li>Todas sus modificaciones quedan registradas con nombre y fecha en el historial de auditoría.</li>
          </ul>
        </div>
      </div>

      {/* Content */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
          <p className="text-sm text-white/50">Cargando empleados...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">{error}</p>
          <button
            onClick={fetchEmpleados}
            className="mt-4 px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20"
          >
            Reintentar
          </button>
        </div>
      ) : empleados.length === 0 ? (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/40">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Aún no hay empleados en este complejo</h3>
          <p className="text-sm text-white/50 mb-6">
            Podés crear hasta {maxEmpleados} cuentas para que tu personal de recepción o cancheros atiendan el turnero y registren reservas.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            disabled={!selectedPredioId}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            Crear Primer Empleado
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {empleados.map((emp) => (
            <div
              key={emp.id}
              className={`bg-white/[0.03] border rounded-2xl p-5 transition-all relative overflow-hidden ${
                emp.activo
                  ? "border-white/10 hover:border-white/20"
                  : "border-red-500/20 bg-red-500/[0.02] opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${
                      emp.activo
                        ? "bg-brand/10 border-brand/20 text-brand"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                  >
                    {emp.nombre.charAt(0)}
                    {emp.apellido.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">
                        {emp.nombre} {emp.apellido}
                      </h4>
                      {emp.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                          <UserCheck className="w-2.5 h-2.5" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          <UserX className="w-2.5 h-2.5" /> Inactivo
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3 text-brand" /> Empleado de Turnero
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setEmpleadoAEliminar(emp)}
                  className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Dar de baja / eliminar empleado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="font-mono text-white/90 truncate">{emp.email}</span>
                </div>
                {emp.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <span>{emp.telefono}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-white/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Dado de alta el{" "}
                    {format(new Date(emp.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Empleado */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121b15] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nuevo Empleado</h3>
                <p className="text-xs text-white/50">
                  Complejo: <span className="text-brand font-semibold">{selectedPredio?.nombre}</span>
                </p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCrearEmpleado} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Juan"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    placeholder="Ej: Pérez"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Email de acceso *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="empleado@picaditoya.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Contraseña inicial * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  El empleado podrá cambiar su contraseña desde su perfil en cualquier momento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Crear Empleado
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Baja */}
      {empleadoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121b15] border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Dar de baja empleado?</h3>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              El empleado <strong className="text-white">{empleadoAEliminar.nombre} {empleadoAEliminar.apellido}</strong> perderá el acceso al turnero de este complejo. El historial de auditoría de los turnos que modificó se conservará intacto.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setEmpleadoAEliminar(null)}
                disabled={eliminando}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
