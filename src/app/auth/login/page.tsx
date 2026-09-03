"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vista actual: "login" | "recuperar"
  const [vista, setVista] = useState<"login" | "recuperar">("login");
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos. Intentá de nuevo.");
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const callbackUrl = urlParams.get("callbackUrl");
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          try {
            const res = await fetch("/api/auth/session");
            const sess = await res.json();
            const rol = sess?.user?.rol;
            if (rol === "super_admin") {
              router.push("/super-admin");
            } else if (["admin", "empleado"].includes(rol)) {
              router.push("/admin");
            } else {
              router.push("/cliente/mis-turnos");
            }
          } catch {
            router.push("/cliente/mis-turnos");
          }
        }
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    // TODO: Implementar endpoint de recuperación de contraseña
    // Por ahora simulamos el envío
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRecuperacionEnviada(true);
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-text-main overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-surface/90 backdrop-blur border-b border-border">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-text-main font-bold text-xl tracking-tight">PicaditoYa</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors px-3 py-1.5 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </nav>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">

          {/* Card principal */}
          <div className="bg-surface-card border border-border rounded-3xl p-8 shadow-lg">

            {/* Logo + Título */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-brand" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {vista === "login" ? "Bienvenido de vuelta" : "Recuperar contraseña"}
              </h1>
              <p className="text-text-muted text-sm mt-1">
                {vista === "login"
                  ? "Ingresá tus datos para acceder a tu cuenta"
                  : "Te enviaremos un link para restablecer tu contraseña"}
              </p>
            </div>

            {/* ── FORMULARIO LOGIN ── */}
            {vista === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-sm font-semibold text-text-muted">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-surface-hover border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-sm font-semibold text-text-muted">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-surface-hover border border-border rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main transition-colors rounded-lg"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Olvidé mi contraseña */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setVista("recuperar"); setError(null); }}
                    className="text-xs text-brand hover:text-brand-hover transition-colors font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Botón Login */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm mt-2"
                >
                  {cargando ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Ingresando...</>
                  ) : (
                    "Iniciar sesión"
                  )}
                </button>
              </form>
            )}

            {/* ── FORMULARIO RECUPERAR CONTRASEÑA ── */}
            {vista === "recuperar" && !recuperacionEnviada && (
              <form onSubmit={handleRecuperar} className="space-y-4">

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="recover-email" className="text-sm font-semibold text-text-muted">Email de tu cuenta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      id="recover-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={emailRecuperacion}
                      onChange={(e) => setEmailRecuperacion(e.target.value)}
                      required
                      className="w-full bg-surface-hover border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {cargando ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                  ) : (
                    "Enviar link de recuperación"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setVista("login"); setError(null); }}
                  className="w-full text-sm text-text-muted hover:text-text-main transition-colors font-medium py-2 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a iniciar sesión
                </button>
              </form>
            )}

            {/* ── CONFIRMACIÓN RECUPERACIÓN ── */}
            {vista === "recuperar" && recuperacionEnviada && (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-brand" />
                </div>
                <div>
                  <p className="text-text-main font-semibold">¡Email enviado!</p>
                  <p className="text-text-muted text-sm mt-1">
                    Si existe una cuenta con <span className="text-brand font-medium">{emailRecuperacion}</span>,
                    te llegará un link para restablecer tu contraseña.
                  </p>
                </div>
                <button
                  onClick={() => { setVista("login"); setRecuperacionEnviada(false); setError(null); }}
                  className="text-sm text-brand hover:text-brand-hover transition-colors font-medium flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a iniciar sesión
                </button>
              </div>
            )}

            {/* Separador + Link a registro */}
            {vista === "login" && (
              <div className="mt-6 pt-6 border-t border-border text-center space-y-2">
                <p className="text-sm text-text-muted">
                  ¿Querés pedir turnos y no tenés cuenta?{" "}
                  <Link href="/auth/register" className="text-brand hover:text-brand-hover font-semibold transition-colors">
                    Creá tu cuenta de jugador
                  </Link>
                </p>
                <p className="text-xs text-text-muted/60">
                  ¿Sos dueño de un complejo deportivo?{" "}
                  <Link href="/registrar-cancha" className="text-white hover:text-brand transition-colors font-medium">
                    Sumá tu predio a PicaditoYa
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
