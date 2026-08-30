"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Clock, Calendar, ChevronRight, Loader2, Map as MapIcon, SlidersHorizontal, Crosshair } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

// Carga dinámica del mapa para evitar SSR issues con MapTiler SDK
const MapaDisponibilidad = dynamic(() => import("@/components/map/MapaDisponibilidad"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-hover rounded-full">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  ),
});

type Cancha = {
  id: string;
  nombre: string;
  precioTurno: number;
  duracionTurnoMinutos: number;
  predio: {
    id: string;
    nombre: string;
    direccion: string;
    latitud: number;
    longitud: number;
  };
};

const FRANJAS_HORARIAS = [
  { label: "18:00", inicio: "18:00", fin: "19:00" },
  { label: "19:00", inicio: "19:00", fin: "20:00" },
  { label: "20:00", inicio: "20:00", fin: "21:00" },
  { label: "21:00", inicio: "21:00", fin: "22:00" },
  { label: "22:00", inicio: "22:00", fin: "23:00" },
];

export default function HomePage() {
  const hoy = format(new Date(), "yyyy-MM-dd");

  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [distancia, setDistancia] = useState(5); // radio en km
  const [fecha, setFecha] = useState(hoy);
  const [franja, setFranja] = useState<(typeof FRANJAS_HORARIAS)[0] | null>(null);
  
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    if (!franja) return;
    setCargando(true);
    setBuscado(true);

    const params = new URLSearchParams({
      fecha,
      horaInicio: franja.inicio,
      horaFin: franja.fin,
      ...(nombre ? { nombre } : {}),
      // TODO: Implementar ciudad y distancia en la API de backend
    });

    try {
      const res = await fetch(`/api/disponibilidad?${params}`);
      const data = await res.json();
      setCanchas(data.canchas ?? []);
    } catch {
      setCanchas([]);
    } finally {
      setCargando(false);
    }
  }, [fecha, franja, nombre, ciudad, distancia]);

  const prediosEnMapa = canchas.map((c) => c.predio);
  const prediosUnicos = prediosEnMapa.filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  );

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-text-main overflow-x-hidden bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: "url('/hero-bg.jpg')" }}
    >
      {/* Capa oscura global para atenuar fuertemente la foto y que no moleste */}
      <div className="absolute inset-0 bg-surface/95 z-0" />
      
      {/* Contenedor relativo para el contenido */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        
        {/* ── HEADER SUPERPUESTO ── */}
        <header className="absolute top-0 left-0 right-0 w-full z-50 flex items-center justify-between px-6 py-6 bg-transparent border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-brand rounded-full outline-none">
            <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(69,228,148,0.4)] group-hover:scale-105 transition-transform">
              <span className="text-surface font-black text-xl italic tracking-tighter">P</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm group-hover:text-white/90 transition-colors">
              Picadito<span className="text-brand">Ya</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/auth/login" className="bg-brand hover:bg-brand-hover text-surface px-6 py-2.5 rounded-full font-bold transition-all hover:scale-105 shadow-[0_0_15px_rgba(69,228,148,0.3)] text-sm focus-visible:ring-2 focus-visible:ring-white outline-none">
              Acceder
            </Link>
          </nav>
        </header>

        {/* ── SECCIÓN 1: HERO (Estilo Picadito.app) ── */}
        <section className="w-full px-8 pt-32 pb-12 md:pt-44 md:pb-16 md:px-16 lg:px-24 animate-fade-in relative flex flex-col items-start justify-center">
          <div className="max-w-4xl z-10 relative w-full text-left flex flex-col gap-1 md:gap-2">
            <span className="text-brand font-bold tracking-[0.25em] text-xs md:text-sm uppercase drop-shadow-md">FÚTBOL • PÁDEL • BÁSQUET • TENIS</span>
            <h1 className="font-display text-[4rem] md:text-[6rem] lg:text-[7.5rem] text-[#F4F7F5] leading-[0.85] tracking-tight mb-4 drop-shadow-2xl uppercase mt-2">
              La cancha<br/>te espera
            </h1>
            <p className="text-white/90 font-medium text-lg md:text-2xl tracking-wide drop-shadow-md text-balance max-w-2xl mt-2 md:mt-4">
              Armá el partido, invitá a los tuyos y pagá tu parte.<br className="hidden md:block"/> Lo demás se define en la cancha.
            </p>
          </div>
        </section>

        {/* ── CONTENIDO PRINCIPAL: RESULTADOS Y MAPA ── */}
        <main className="flex-1 w-full px-8 md:px-16 lg:px-24 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
          
          {/* LISTADO DE RESULTADOS */}
          <section className="w-full lg:w-5/12 flex flex-col gap-6">
            
            {/* BUSCADOR COMPACTO */}
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-[2rem] flex flex-col gap-4 w-full">
              
              <div className="w-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3.5 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                <MapPin className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Ciudad o complejo..."
                  value={ciudad}
                  onChange={(e) => {
                    setCiudad(e.target.value);
                    setNombre(e.target.value);
                  }}
                  aria-label="Ubicación o nombre del complejo"
                  className="w-full bg-transparent text-white placeholder:text-white/50 text-base focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3.5 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <Calendar className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <input
                    type="date"
                    value={fecha}
                    min={hoy}
                    onChange={(e) => setFecha(e.target.value)}
                    aria-label="Fecha de la reserva"
                    className="w-full bg-transparent text-white text-base focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3.5 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <Clock className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <select
                    value={franja?.inicio || ""}
                    onChange={(e) => {
                      const f = FRANJAS_HORARIAS.find(x => x.inicio === e.target.value);
                      setFranja(f || null);
                    }}
                    aria-label="Horario de inicio"
                    className="w-full bg-transparent text-white text-base focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="" className="text-black">Cualquier horario</option>
                    {FRANJAS_HORARIAS.map(f => (
                      <option key={f.inicio} value={f.inicio} className="text-black">{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={buscar}
                disabled={!franja || cargando}
                aria-label="Buscar canchas disponibles"
                className="w-full mt-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-surface font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(69,228,148,0.2)] hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
              >
                {cargando ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Search className="w-5 h-5" aria-hidden="true" />}
                Buscar
              </button>
            </div>

            <h2 className="text-2xl font-medium text-white flex items-center justify-between mt-2">
              Canchas disponibles
              {buscado && !cargando && <span className="text-sm font-normal text-white/80 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">{canchas.length} resultados</span>}
            </h2>

            {!buscado && (
              <div className="bg-surface-card/40 backdrop-blur-2xl ring-1 ring-white/10 rounded-[2.5rem] flex flex-col items-center justify-center h-[300px] text-center p-8 shadow-xl">
                <SlidersHorizontal className="w-12 h-12 text-white/20 mb-4" aria-hidden="true" />
                <p className="text-white/70 font-medium text-lg text-balance">Completá los datos en el buscador superior para ver las opciones cerca tuyo.</p>
              </div>
            )}

            {buscado && !cargando && canchas.length === 0 && (
              <div className="bg-surface-card/40 backdrop-blur-2xl ring-1 ring-white/10 rounded-[2.5rem] flex flex-col items-center justify-center h-[300px] text-center p-8 shadow-xl">
                <p className="text-white font-medium text-lg">No hay canchas disponibles.</p>
                <p className="text-white/60 mt-2 text-balance">Intentá ampliando la búsqueda o eligiendo otro horario.</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {canchas.map((cancha) => (
                <Link
                  key={cancha.id}
                  href={`/predio/${cancha.predio.id}`}
                  onClick={() => setCanchaSeleccionada(cancha.id)}
                  aria-label={`Ver detalles de ${cancha.nombre} en ${cancha.predio.nombre}`}
                  className={`group flex flex-col sm:flex-row gap-4 p-5 rounded-3xl border transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand focus:outline-none ${
                    canchaSeleccionada === cancha.id
                      ? "border-brand bg-brand/10 backdrop-blur-xl shadow-lg"
                      : "border-white/10 bg-surface-card/40 backdrop-blur-xl hover:border-white/30 hover:bg-surface-card/60 shadow-md"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-xl truncate group-hover:text-brand transition-colors">{cancha.nombre}</h3>
                    <p className="text-sm text-white/60 truncate flex items-center gap-1.5 mt-2">
                      <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> {cancha.predio.nombre}
                    </p>
                    <p className="text-sm text-white/40 truncate ml-5.5 mt-0.5">{cancha.predio.direccion}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end shrink-0 justify-between">
                    <div className="bg-white/10 text-white font-medium px-4 py-1.5 rounded-full ring-1 ring-white/20 text-sm">
                      ${cancha.precioTurno.toLocaleString("es-AR")}
                    </div>
                    <span className="text-white/80 font-medium flex items-center text-sm mt-4 sm:mt-0 group-hover:text-white transition-colors">
                      Reservar <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* MAPA */}
          <section className="w-full lg:w-7/12 min-h-[400px] lg:h-auto">
            <div className="sticky top-28 w-full h-[400px] lg:h-[calc(100vh-160px)] rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10 bg-surface-card/20 backdrop-blur-3xl">
              <MapaDisponibilidad predios={prediosUnicos} canchaSeleccionada={canchaSeleccionada} />
            </div>
          </section>

          </main>
      </div>
    </div>
  );
}
