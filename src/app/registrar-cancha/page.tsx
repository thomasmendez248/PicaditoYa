"use client";

import { useState } from "react";
import { CheckCircle2, TrendingUp, CalendarCheck, Wallet, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

export default function RegistrarCanchaPage() {
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    predio: "",
    encargado: "",
    telefono: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/solicitudes-registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud. Intenta nuevamente.");
      }

      setEnviado(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-white overflow-x-hidden bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/hero-bg.jpg')" }}
    >
      {/* Capa oscura idéntica a la Home */}
      <div className="absolute inset-0 bg-surface/95 z-0" />

      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/10 blur-[100px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-brand/5 blur-[120px] rounded-full" />
      </div>

      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-12 md:pt-40 md:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
        
        {/* Lado Izquierdo: Beneficios */}
        <div className="flex flex-col justify-center gap-8">
          <div>
            <h1 className="font-display text-5xl md:text-7xl uppercase leading-none tracking-tight text-[#F4F7F5] mb-4 drop-shadow-lg">
              TU PREDIO,<br />
              <span className="text-brand">AL SIGUIENTE NIVEL</span>
            </h1>
            <p className="text-lg text-white/70 text-balance">
              Sumá tu complejo deportivo a la red de PicaditoYa y modernizá la forma en la que gestionás tus canchas. Olvidate de los mensajes a las 3 AM.
            </p>
          </div>

          <div className="flex flex-col gap-6 mt-4">
            <div className="flex gap-4 items-start">
              <div className="bg-brand/10 p-3 rounded-2xl shrink-0 border border-brand/20">
                <CalendarCheck className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white mb-1">Reservas Automáticas</h3>
                <p className="text-sm text-white/60">Tu agenda 100% sincronizada. Los jugadores reservan sin necesidad de asistencia manual.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-brand/10 p-3 rounded-2xl shrink-0 border border-brand/20">
                <Wallet className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white mb-1">Cobro Seguro</h3>
                <p className="text-sm text-white/60">Integración con pagos para que las reservas se señen solas. Cero dolores de cabeza.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-brand/10 p-3 rounded-2xl shrink-0 border border-brand/20">
                <TrendingUp className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white mb-1">Mayor Visibilidad</h3>
                <p className="text-sm text-white/60">Aparecé en el mapa de PicaditoYa y conseguí nuevos clientes de tu ciudad todos los días.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-[#0f1712]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
            
            {enviado ? (
              <div className="flex flex-col items-center justify-center text-center py-12 animate-fade-in">
                <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-brand/50">
                  <CheckCircle2 className="w-8 h-8 text-brand" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h2>
                <p className="text-white/60 text-sm text-balance">
                  Nuestros administradores recibieron tu información. Te vamos a contactar a la brevedad para dar de alta tu complejo.
                </p>
                <button 
                  onClick={() => setEnviado(false)}
                  className="mt-8 text-sm text-brand hover:text-white transition-colors"
                >
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Sumate a la plataforma</h2>
                  <p className="text-sm text-white/50 mb-4">Dejanos los datos y nos ponemos en contacto.</p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm flex items-center gap-2.5 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="predio" className="text-sm font-semibold text-white/80">Nombre del Predio</label>
                  <input
                    required
                    id="predio"
                    type="text"
                    placeholder="Ej. El Galpón Fútbol 5"
                    value={formData.predio}
                    onChange={(e) => setFormData({...formData, predio: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-white placeholder:text-white/30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="encargado" className="text-sm font-semibold text-white/80">Nombre del Encargado</label>
                  <input
                    required
                    id="encargado"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.encargado}
                    onChange={(e) => setFormData({...formData, encargado: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-white placeholder:text-white/30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="telefono" className="text-sm font-semibold text-white/80">Teléfono (WhatsApp)</label>
                  <input
                    required
                    id="telefono"
                    type="tel"
                    placeholder="Cod. área + número"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-white placeholder:text-white/30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-semibold text-white/80">Correo Electrónico</label>
                  <input
                    required
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-white placeholder:text-white/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="mt-4 w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-surface font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(69,228,148,0.2)] hover:scale-[1.02] outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Solicitud"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
