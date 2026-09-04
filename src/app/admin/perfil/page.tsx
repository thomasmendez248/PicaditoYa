"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  Edit3,
  Sparkles,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import PredioModal from "@/components/admin/PredioModal";

export default function AdminPerfilPage() {
  const { data: session, update } = useSession();
  const { selectedPredio, predios, maxPredios } = useAdmin();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalPredioOpen, setModalPredioOpen] = useState(false);

  useEffect(() => {
    async function cargarPerfil() {
      try {
        const res = await fetch("/api/usuario/perfil");
        if (res.ok) {
          const data = await res.json();
          if (data.usuario) {
            setNombre(data.usuario.nombre || "");
            setApellido(data.usuario.apellido || "");
            setTelefono(data.usuario.telefono || "");
            setEmail(data.usuario.email || "");
          }
        } else if (session?.user?.name) {
          const partes = session.user.name.split(" ");
          setNombre(partes[0] || "");
          setApellido(partes.slice(1).join(" ") || "");
          setEmail(session?.user?.email || "");
        }
      } catch (err) {
        console.error("Error al cargar perfil admin", err);
      } finally {
        setCargandoDatos(false);
      }
    }

    cargarPerfil();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    // Validación obligatoria de Nombre y Apellido
    if (!nombre.trim() || nombre.trim().length < 2) {
      setError("El nombre es obligatorio y debe tener al menos 2 caracteres.");
      return;
    }

    if (!apellido.trim() || apellido.trim().length < 2) {
      setError("El apellido es obligatorio y debe tener al menos 2 caracteres.");
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch("/api/usuario/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudieron actualizar tus datos personales.");
      }

      setMensajeExito("¡Tus datos personales fueron guardados con éxito!");

      // Actualizar sesión NextAuth
      await update({
        ...session,
        user: {
          ...session?.user,
          name: `${nombre.trim()} ${apellido.trim()}`,
        },
      });

      setTimeout(() => {
        setMensajeExito(null);
      }, 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al guardar los cambios.");
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <span className="text-xs text-white/60 font-semibold">Cargando perfil...</span>
        </div>
      </div>
    );
  }

  const iniciales = `${nombre ? nombre.charAt(0) : "A"}${apellido ? apellido.charAt(0) : ""}`.toUpperCase();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* ── HEADER DEL PERFIL ADMIN ── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden text-center sm:text-left">
        <div className="w-20 h-20 rounded-3xl bg-brand text-surface font-black text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(69,228,148,0.3)] shrink-0">
          {iniciales}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              {nombre || apellido ? `${nombre} ${apellido}`.trim() : "Administrador"}
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/30 w-fit mx-auto sm:mx-0">
              Administrador
            </span>
          </div>
          <p className="text-white/60 text-sm font-mono flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {email || session?.user?.email}
          </p>
        </div>
      </div>

      {/* Mensajes de Feedback */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── FORMULARIO: DATOS PERSONALES DEL ADMIN ── */}
      <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl space-y-6">
        <div>
          <h2 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
            <User className="w-5 h-5 text-brand" />
            Datos Personales del Administrador
          </h2>
          <p className="text-xs text-white/50 mt-1">
            El nombre y apellido son obligatorios. Estos datos figuran en tu cuenta y comprobantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Nombre * <span className="text-brand">(Obligatorio)</span>
              </label>
              <input
                type="text"
                required
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/30 transition-all"
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Apellido * <span className="text-brand">(Obligatorio)</span>
              </label>
              <input
                type="text"
                required
                placeholder="Tu apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Email (Solo Lectura) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50">
                  Correo Electrónico
                </label>
                <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-brand" /> Administrador
                </span>
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-mono text-white/50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Teléfono Personal */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Teléfono Personal
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="tel"
                  placeholder="Ej: 3584123456"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/30 transition-all"
                />
              </div>
              <p className="text-[11px] text-white/40 mt-1.5">
                Para comunicaciones administrativas internas de la plataforma.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black px-8 py-3.5 rounded-full text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(69,228,148,0.3)] hover:scale-105"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Datos Personales</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── DATOS DE LA CANCHA / COMPLEJO ACTIVO ── */}
      {selectedPredio && (
        <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand" />
                Datos de la Cancha / Complejo ({selectedPredio.nombre})
              </h2>
              <p className="text-xs text-white/50 mt-1">
                La cancha debe contar con un número de teléfono obligatorio para que los clientes puedan enviar WhatsApp.
              </p>
            </div>

            <button
              onClick={() => setModalPredioOpen(true)}
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-2 transition-all hover:border-brand/40 self-start sm:self-auto"
            >
              <Edit3 className="w-4 h-4 text-brand" />
              Editar Complejo y Teléfono
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Nombre</span>
              <span className="text-sm font-bold text-white">{selectedPredio.nombre}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                Teléfono de la Cancha (WhatsApp)
              </span>
              <span className="text-sm font-bold text-brand font-mono">
                {selectedPredio.telefono || "⚠️ Sin teléfono (requerido)"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Dirección</span>
              <span className="text-sm font-bold text-white truncate block">{selectedPredio.direccion}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar predio y su teléfono */}
      {selectedPredio && (
        <PredioModal
          isOpen={modalPredioOpen}
          onClose={() => setModalPredioOpen(false)}
          predio={selectedPredio}
        />
      )}

      {/* ── PLAN Y MEMBRESÍA ── */}
      <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Membresía PicaditoYa
          </span>
          <h3 className="text-xl font-display font-black text-white uppercase tracking-wide">
            Administración de Complejos
          </h3>
          <p className="text-xs text-white/60">
            Podés gestionar hasta {maxPredios} complejo(s) deportivo(s). Actualmente tenés {predios.length} registrado(s).
          </p>
        </div>
      </div>

    </div>
  );
}
