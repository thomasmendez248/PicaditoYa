"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ModalReservaCancha from "@/components/predio/ModalReservaCancha";
import {
  MapPin,
  Phone,
  Clock,
  Users,
  ArrowLeft,
  CalendarDays,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";

type Cancha = {
  id: string;
  nombre: string;
  capacidad: number;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura: string;
  horarioCierre: string;
  diasOperativos: number[];
  politicaCancelacionHoras: number | null;
  predioId: string;
};

type Predio = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string | null;
  latitud: number;
  longitud: number;
  politicaCancelacionHoras: number;
  canchas: Cancha[];
};

export default function PredioDetalleClient({ predio }: { predio: Predio }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [canchaSeleccionada, setCanchaSeleccionada] = useState<Cancha | null>(null);
  const [modalReservaOpen, setModalReservaOpen] = useState(false);

  const abrirModalReserva = (cancha: Cancha) => {
    if (!session) {
      // Redirigir al login con callback a esta página
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    setCanchaSeleccionada(cancha);
    setModalReservaOpen(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans text-text-main overflow-x-hidden bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/hero-bg.jpg')" }}
    >
      {/* Capa oscura global */}
      <div className="absolute inset-0 bg-surface/95 z-0" />

      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 pt-32 pb-20 space-y-8 animate-fade-in">
          
          {/* Botón Volver */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all hover:border-brand/40"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al buscador
            </Link>
          </div>

          {/* ── HEADER DEL PREDIO ── */}
          <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-brand">Complejo Deportivo</span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-white uppercase tracking-wide drop-shadow-md mt-1">
                {predio.nombre}
              </h1>
              <p className="text-white/80 text-base sm:text-lg flex items-center gap-2 mt-2">
                <MapPin className="w-5 h-5 text-brand shrink-0" />
                {predio.direccion}
              </p>
              {predio.telefono && (
                <p className="text-white/60 text-sm flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-white/40 shrink-0" />
                  {predio.telefono}
                </p>
              )}
            </div>

            {predio.telefono && (
              <div className="shrink-0">
                <a
                  href={`https://wa.me/${predio.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola! Me contacto desde PicaditoYa para consultar por reservas en ${predio.nombre}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand hover:bg-brand-hover text-surface font-black px-8 py-4 rounded-full inline-flex items-center gap-2 shadow-[0_0_20px_rgba(69,228,148,0.3)] transition-all hover:scale-105 text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Contactar por WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* ── LISTADO DE CANCHAS DEL PREDIO ── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-display font-black text-white uppercase tracking-wide">
                  Canchas disponibles ({predio.canchas.length})
                </h2>
                <p className="text-xs text-white/60 mt-0.5">Hacé click en cualquier cancha para elegir fecha y horario de reserva</p>
              </div>
            </div>

            {predio.canchas.length === 0 ? (
              <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-12 rounded-[2.5rem] text-center shadow-xl">
                <CalendarDays className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white font-bold text-lg">Este complejo aún no ha publicado canchas activas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {predio.canchas.map((cancha) => {
                  const tipoCancha =
                    cancha.capacidad <= 10
                      ? "Fútbol 5"
                      : cancha.capacidad <= 14
                      ? "Fútbol 7"
                      : "Fútbol 11";

                  return (
                    <div
                      key={cancha.id}
                      onClick={() => abrirModalReserva(cancha)}
                      className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 hover:border-brand/50 p-7 rounded-[2.5rem] shadow-2xl flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(69,228,148,0.2)] hover:scale-[1.02] cursor-pointer group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-brand/15 text-brand border border-brand/30">
                            {tipoCancha}
                          </span>
                          <span className="text-xs text-white/50 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-white/40" /> {cancha.duracionTurnoMinutos} min
                          </span>
                        </div>

                        <div>
                          <h3 className="text-3xl font-display font-black text-white uppercase tracking-wide group-hover:text-brand transition-colors">
                            {cancha.nombre}
                          </h3>
                          <p className="text-xs text-white/60 flex items-center gap-1.5 mt-2">
                            <Users className="w-3.5 h-3.5 text-brand" /> Capacidad: {cancha.capacidad} jugadores
                          </p>
                          <p className="text-xs text-white/60 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-brand" /> Horario: {cancha.horarioApertura} a {cancha.horarioCierre}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">Precio por turno</span>
                          <span className="text-2xl font-mono font-black text-brand">
                            ${cancha.precioTurno.toLocaleString("es-AR")}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalReserva(cancha);
                          }}
                          className="bg-brand hover:bg-brand-hover text-surface font-black px-6 py-3 rounded-full text-xs transition-all shadow-[0_0_15px_rgba(69,228,148,0.25)] hover:scale-105 flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Elegir Horario
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Políticas de Cancelación */}
          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-3.5 text-xs text-white/70">
            <ShieldCheck className="w-6 h-6 text-brand shrink-0" />
            <span>
              Cancelación gratuita hasta <strong>{predio.politicaCancelacionHoras ?? 24} horas</strong> antes del horario pactado.
            </span>
          </div>

        </main>

        {/* Modal Interactivo de Elección de Horario y Reserva */}
        <ModalReservaCancha
          isOpen={modalReservaOpen}
          onClose={() => setModalReservaOpen(false)}
          cancha={canchaSeleccionada}
          predio={predio}
        />

        <Footer />
      </div>
    </div>
  );
}
