"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/cliente/mis-turnos";

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  // El teléfono se guarda como "+54" + lo que escribe el usuario
  const [telefonoSufijo, setTelefonoSufijo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const telefono = `+54${telefonoSufijo.trim()}`;

    try {
      // 1. Crear el usuario en la BD
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, telefono, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear la cuenta.");
        return;
      }

      // 2. Hacer login automático
      setExito(true);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Si el login falla por alguna razón, mandamos al login manualmente
        router.push("/auth/login");
        return;
      }

      // 3. Redirigir a callbackUrl o a mis-turnos
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
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

          {/* Éxito */}
          {exito && (
            <div className="bg-surface-card border border-brand/30 rounded-3xl p-8 shadow-lg text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-brand" />
              </div>
              <h1 className="text-2xl font-black text-white">¡Cuenta creada!</h1>
              <p className="text-text-muted text-sm">Iniciando sesión automáticamente...</p>
              <Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" />
            </div>
          )}

          {/* Formulario */}
          {!exito && (
            <div className="bg-surface-card border border-border rounded-3xl p-8 shadow-lg">

              {/* Logo + Título */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-brand" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Crear cuenta</h1>
                <p className="text-text-muted text-sm mt-1">
                  Reservá canchas en segundos, sin llamadas
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Error global */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Nombre + Apellido en una fila */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-nombre" className="text-sm font-semibold text-text-muted">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        id="reg-nombre"
                        type="text"
                        placeholder="Juan"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        className="w-full bg-surface-hover border border-border rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="reg-apellido" className="text-sm font-semibold text-text-muted">Apellido</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        id="reg-apellido"
                        type="text"
                        placeholder="Pérez"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        required
                        className="w-full bg-surface-hover border border-border rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="text-sm font-semibold text-text-muted">Gmail / Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="juan@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-surface-hover border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-text-muted/50"
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-telefono" className="text-sm font-semibold text-text-muted">
                    Teléfono <span className="text-text-muted/60 font-normal">(Argentina)</span>
                  </label>
                  <div className="flex items-center bg-surface-hover border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent transition-all">
                    {/* Prefijo fijo */}
                    <div className="flex items-center gap-1.5 pl-3 pr-2 border-r border-border shrink-0">
                      <Phone className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-bold text-text-muted">+54</span>
                    </div>
                    <input
                      id="reg-telefono"
                      type="tel"
                      placeholder="9 11 12345678"
                      value={telefonoSufijo}
                      onChange={(e) => setTelefonoSufijo(e.target.value)}
                      required
                      className="flex-1 bg-transparent pl-3 pr-4 py-3 text-sm focus:outline-none placeholder:text-text-muted/50"
                    />
                  </div>
                  <p className="text-xs text-text-muted/60 ml-1">Ej: 9 11 12345678</p>
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-password" className="text-sm font-semibold text-text-muted">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
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

                {/* Botón registrar */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm mt-2"
                >
                  {cargando ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creando cuenta...</>
                  ) : (
                    "Crear cuenta gratis"
                  )}
                </button>
              </form>

              {/* Link a login */}
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-text-muted">
                  ¿Ya tenés cuenta?{" "}
                  <Link href="/auth/login" className="text-brand hover:text-brand-hover font-semibold transition-colors">
                    Iniciá sesión
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
