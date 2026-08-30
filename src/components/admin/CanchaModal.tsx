"use client";

import { useState, useEffect } from "react";
import { X, CircleDot, Clock, DollarSign, Users, Calendar, AlertCircle, Loader2, Trash2 } from "lucide-react";

export type CanchaData = {
  id?: string;
  predioId: string;
  nombre: string;
  capacidad: number;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura: string;
  horarioCierre: string;
  diasOperativos: number[];
  politicaCancelacionHoras?: number | null;
};

const DIAS_SEMANA = [
  { id: 1, label: "L" },
  { id: 2, label: "M" },
  { id: 3, label: "M" },
  { id: 4, label: "J" },
  { id: 5, label: "V" },
  { id: 6, label: "S" },
  { id: 0, label: "D" },
];

export default function CanchaModal({
  isOpen,
  onClose,
  cancha,
  predioId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  cancha?: CanchaData | null;
  predioId: string;
  onSuccess: () => void;
}) {
  const isEditing = !!cancha?.id;

  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(10);
  const [precioTurno, setPrecioTurno] = useState(15000);
  const [duracionTurnoMinutos, setDuracionTurnoMinutos] = useState(60);
  const [horarioApertura, setHorarioApertura] = useState("08:00");
  const [horarioCierre, setHorarioCierre] = useState("23:00");
  const [diasOperativos, setDiasOperativos] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [politicaCancelacionHoras, setPoliticaCancelacionHoras] = useState<number | undefined>(24);

  const [cargando, setCargando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cancha) {
      setNombre(cancha.nombre || "");
      setCapacidad(cancha.capacidad ?? 10);
      setPrecioTurno(cancha.precioTurno ?? 15000);
      setDuracionTurnoMinutos(cancha.duracionTurnoMinutos ?? 60);
      setHorarioApertura(cancha.horarioApertura || "08:00");
      setHorarioCierre(cancha.horarioCierre || "23:00");
      setDiasOperativos(cancha.diasOperativos || [1, 2, 3, 4, 5, 6, 0]);
      setPoliticaCancelacionHoras(cancha.politicaCancelacionHoras ?? 24);
    } else {
      setNombre("");
      setCapacidad(10);
      setPrecioTurno(15000);
      setDuracionTurnoMinutos(60);
      setHorarioApertura("08:00");
      setHorarioCierre("23:00");
      setDiasOperativos([1, 2, 3, 4, 5, 6, 0]);
      setPoliticaCancelacionHoras(24);
    }
    setError(null);
  }, [cancha, isOpen]);

  if (!isOpen) return null;

  const toggleDia = (diaId: number) => {
    if (diasOperativos.includes(diaId)) {
      if (diasOperativos.length === 1) return; // Mínimo 1 día
      setDiasOperativos(diasOperativos.filter((d) => d !== diaId));
    } else {
      setDiasOperativos([...diasOperativos, diaId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const payload = {
      predioId,
      nombre,
      capacidad: Number(capacidad),
      precioTurno: Number(precioTurno),
      duracionTurnoMinutos: Number(duracionTurnoMinutos),
      horarioApertura,
      horarioCierre,
      diasOperativos,
      politicaCancelacionHoras: politicaCancelacionHoras ? Number(politicaCancelacionHoras) : null,
    };

    try {
      const url = isEditing ? `/api/admin/canchas/${cancha.id}` : "/api/admin/canchas";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la cancha");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = async () => {
    if (!cancha?.id) return;
    const confirm = window.confirm(`¿Estás seguro de eliminar la cancha "${cancha.nombre}"?`);
    if (!confirm) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/admin/canchas/${cancha.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-sm">
              <CircleDot className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wide">
                {isEditing ? `Modificar ${cancha.nombre}` : "Nueva Cancha"}
              </h2>
              <p className="text-xs text-white/60">Configuración de precio, capacidad y horarios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Nombre de la Cancha *</label>
            <input
              type="text"
              required
              placeholder="Ej: Cancha 1 - Sintético Pro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Precio por Turno ($) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={precioTurno}
                  onChange={(e) => setPrecioTurno(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Capacidad (jugadores)</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="number"
                  required
                  min="2"
                  max="30"
                  value={capacidad}
                  onChange={(e) => setCapacidad(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Horario Apertura *</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="time"
                  required
                  value={horarioApertura}
                  onChange={(e) => setHorarioApertura(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Horario Cierre *</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="time"
                  required
                  value={horarioCierre}
                  onChange={(e) => setHorarioCierre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Días Operativos</label>
            <div className="flex items-center gap-2">
              {DIAS_SEMANA.map((dia) => {
                const activo = diasOperativos.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => toggleDia(dia.id)}
                    className={`w-10 h-10 rounded-2xl text-xs font-black transition-all ${
                      activo
                        ? "bg-brand text-surface shadow-[0_0_10px_rgba(69,228,148,0.4)] border border-brand"
                        : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Duración Turno (min)</label>
              <select
                value={duracionTurnoMinutos}
                onChange={(e) => setDuracionTurnoMinutos(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white cursor-pointer"
              >
                <option value={30} className="text-black">30 min</option>
                <option value={60} className="text-black">60 min</option>
                <option value={90} className="text-black">90 min</option>
                <option value={120} className="text-black">120 min</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Cancelación (horas)</label>
              <input
                type="number"
                min="0"
                value={politicaCancelacionHoras ?? ""}
                onChange={(e) => setPoliticaCancelacionHoras(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="24"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={eliminando || cargando}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar Cancha
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-full border border-white/10 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando || eliminando}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black px-7 py-3 rounded-full text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(69,228,148,0.3)] hover:scale-105"
              >
                {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isEditing ? "Guardar Cambios" : "Crear Cancha"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
