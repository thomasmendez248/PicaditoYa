"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogOut,
  ArrowLeft,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

export default function ClientePerfilPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/cliente/perfil");
      return;
    }

    if (status === "authenticated") {
      // Cargar datos actuales desde el backend
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
          } else {
            // Fallback a sesión
            if (session?.user?.name) {
              const partes = session.user.name.split(" ");
              setNombre(partes[0] || "");
              setApellido(partes.slice(1).join(" ") || "");
            }
            setEmail(session?.user?.email || "");
          }
        } catch (err) {
          console.error("Error al cargar perfil", err);
        } finally {
          setCargandoDatos(false);
        }
      }

      cargarPerfil();
    }
  }, [status, router, session]);

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

      // Actualizar sesión de NextAuth para reflejar el nombre completo
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

  if (status === "loading" || cargandoDatos) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
          <span className="text-xs text-white/60 font-semibold">Cargando tu perfil...</span>
        </div>
      </div>
    );
  }

  const iniciales = `${nombre ? nombre.charAt(0) : "U"}${apellido ? apellido.charAt(0) : ""}`.toUpperCase();
  const userRole = (session?.user as any)?.rol || "cliente";

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-text-main overflow-x-hidden bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/hero-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-surface/95 z-0" />

      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Navbar />

        <main className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-12 pt-32 pb-20">
          
          <div className="mb-8 flex items-center justify-between">
            <Link 
              href="/cliente/mis-turnos" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Mis Turnos</span>
            </Link>
          </div>

          <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
            
            {/* Header Perfil */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-white/10 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-brand text-surface font-black text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(69,228,148,0.3)] shrink-0">
                {iniciales}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
                    {nombre || apellido ? `${nombre} ${apellido}`.trim() : session?.user?.name || "Mi Cuenta"}
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/30 w-fit mx-auto sm:mx-0">
                    {userRole === "cliente" ? "Jugador" : userRole}
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

            {/* Formulario de Edición de Datos Personales */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
                  <User className="w-5 h-5 text-brand" />
                  Datos Personales
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Ingresá tu nombre y apellido obligatorios para que los predios y canchas puedan identificar tus reservas.
                </p>
              </div>

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
                      <ShieldCheck className="w-3 h-3 text-brand" /> Cuenta Verificada
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

                {/* Teléfono / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    Teléfono / WhatsApp de Contacto
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
                    Se usará automáticamente al reservar turnos para coordinar por WhatsApp.
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

            {/* Accesos y Estadísticas */}
            <div className="pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/cliente/mis-turnos"
                className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-brand/30 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/15 text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-white group-hover:text-brand transition-colors text-base">
                    Mis Turnos Pedidos
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Ver reservas activas y pasadas
                  </p>
                </div>
              </Link>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">
                    Reputación de Jugador
                  </h2>
                  <p className="text-xs text-emerald-400/80 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Cuenta verificada y activa
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones de Cuenta */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors text-center"
              >
                Explorar Canchas
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
