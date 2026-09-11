"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  KeyRound,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";

interface UsuarioPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  rol: string;
}

export default function EmpleadoPerfilPage() {
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Form Datos Personales
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Form Contraseña
  const [passwordData, setPasswordData] = useState({
    passwordActual: "",
    passwordNuevo: "",
    passwordConfirmacion: "",
  });
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const fetchPerfil = async () => {
    setCargando(true);
    setErrorGeneral(null);
    try {
      const res = await fetch("/api/usuario/perfil");
      if (!res.ok) throw new Error("Error al obtener datos del perfil");
      const data = await res.json();
      setPerfil(data.usuario);
      setFormData({
        nombre: data.usuario.nombre || "",
        apellido: data.usuario.apellido || "",
        email: data.usuario.email || "",
        telefono: data.usuario.telefono || "",
      });
    } catch (err: any) {
      setErrorGeneral(err.message || "Error al cargar el perfil");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePerfil(null);
    setGuardandoPerfil(true);

    try {
      const res = await fetch("/api/usuario/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar perfil");
      }

      setPerfil(data.usuario);
      setMensajePerfil({ tipo: "exito", texto: "¡Tus datos personales fueron actualizados correctamente!" });
    } catch (err: any) {
      setMensajePerfil({ tipo: "error", texto: err.message });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePassword(null);

    if (passwordData.passwordNuevo !== passwordData.passwordConfirmacion) {
      setMensajePassword({ tipo: "error", texto: "La nueva contraseña y su confirmación no coinciden." });
      return;
    }

    if (passwordData.passwordNuevo.length < 6) {
      setMensajePassword({ tipo: "error", texto: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setGuardandoPassword(true);

    try {
      const res = await fetch("/api/usuario/cambiar-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cambiar la contraseña");
      }

      setPasswordData({
        passwordActual: "",
        passwordNuevo: "",
        passwordConfirmacion: "",
      });
      setMensajePassword({ tipo: "exito", texto: "¡Contraseña actualizada con éxito!" });
    } catch (err: any) {
      setMensajePassword({ tipo: "error", texto: err.message });
    } finally {
      setGuardandoPassword(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
        <p className="text-sm text-white/50">Cargando tu información...</p>
      </div>
    );
  }

  if (errorGeneral) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 font-semibold">{errorGeneral}</p>
        <button
          onClick={fetchPerfil}
          className="mt-4 px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-black text-2xl uppercase">
          {perfil?.nombre?.charAt(0) || "E"}
          {perfil?.apellido?.charAt(0) || ""}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">
            Mi Perfil
          </h1>
          <p className="text-xs sm:text-sm text-white/50 flex items-center gap-2 mt-0.5">
            <span className="capitalize">{perfil?.rol || "Empleado"}</span>
            <span>•</span>
            <span className="text-brand font-semibold font-mono">{perfil?.email}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario 1: Datos Personales */}
        <div className="bg-[#0f1712]/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Datos Personales</h2>
              <p className="text-xs text-white/50">Editá tu nombre, apellido, email y teléfono</p>
            </div>
          </div>

          {mensajePerfil && (
            <div
              className={`mb-5 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                mensajePerfil.tipo === "exito"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {mensajePerfil.tipo === "exito" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{mensajePerfil.texto}</span>
            </div>
          )}

          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Apellido
              </label>
              <input
                type="text"
                required
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Email de inicio de sesión
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                />
                <Mail className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Teléfono de contacto
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors"
                />
                <Phone className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={guardandoPerfil}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-brand text-surface hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50 mt-2"
            >
              {guardandoPerfil ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Datos Personales
                </>
              )}
            </button>
          </form>
        </div>

        {/* Formulario 2: Cambiar Contraseña */}
        <div className="bg-[#0f1712]/90 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cambiar Contraseña</h2>
                <p className="text-xs text-white/50">Actualizá tu clave de acceso de forma segura</p>
              </div>
            </div>

            {mensajePassword && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  mensajePassword.tipo === "exito"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {mensajePassword.tipo === "exito" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{mensajePassword.texto}</span>
              </div>
            )}

            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={passwordData.passwordActual}
                    onChange={(e) => setPasswordData({ ...passwordData, passwordActual: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.passwordNuevo}
                    onChange={(e) => setPasswordData({ ...passwordData, passwordNuevo: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.passwordConfirmacion}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, passwordConfirmacion: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand transition-colors font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-white/30 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={guardandoPassword}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-surface transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-2"
              >
                {guardandoPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tarjeta de Seguridad y Permisos */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex items-start gap-4">
        <Shield className="w-5 h-5 text-brand shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm text-white/70">
          <p className="font-bold text-white">Rol y Seguridad de la Cuenta</p>
          <p className="text-white/50 leading-relaxed">
            Tu cuenta tiene rol de <strong>Empleado de Complejo</strong>. Tenés acceso para crear reservas, visualizar turnos y editar estados de reservas en el turnero. Tus modificaciones quedan debidamente registradas con tu nombre y fecha en el registro de auditoría de cada turno.
          </p>
        </div>
      </div>
    </div>
  );
}
