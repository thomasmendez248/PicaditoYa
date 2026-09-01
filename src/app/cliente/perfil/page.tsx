"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { User, Mail, Shield, Calendar, LogOut, ArrowLeft, Award, CheckCircle2 } from "lucide-react";

export default function ClientePerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/cliente/perfil");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();
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

          <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            
            {/* Header Perfil */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-white/10 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-brand text-surface font-black text-3xl flex items-center justify-center shadow-[0_0_20px_rgba(69,228,148,0.3)]">
                {userInitial}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
                    {userName}
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/30 w-fit mx-auto sm:mx-0">
                    {userRole === "cliente" ? "Jugador" : userRole}
                  </span>
                </div>
                <p className="text-white/60 text-sm font-mono flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Accesos y Estadísticas */}
            <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-white/10">
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
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors text-center"
              >
                Explorar Canchas
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-bold text-sm transition-colors flex items-center justify-center gap-2"
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
