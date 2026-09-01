"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Clock, Calendar, ChevronRight, Loader2, Map as MapIcon, SlidersHorizontal, Crosshair } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

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
  capacidad: number;
  precioTurno: number;
  duracionTurnoMinutos: number;
  horarioApertura: string;
  horarioCierre: string;
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
  const [capacidad, setCapacidad] = useState<string>("");
  const [fecha, setFecha] = useState(hoy);
  const [franja, setFranja] = useState<(typeof FRANJAS_HORARIAS)[0] | null>(null);
  
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<string | null>(null);

  // Geolocalización del usuario
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const obtenerUbicacion = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCiudad("📍 Mi ubicación");
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        alert("No se pudo obtener tu ubicación. Verificá los permisos del navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const buscar = useCallback(async () => {
    setCargando(true);
    setBuscado(true);

    const params = new URLSearchParams({
      ...(fecha ? { fecha } : {}),
      ...(franja ? { horaInicio: franja.inicio, horaFin: franja.fin } : {}),
      ...(nombre ? { nombre } : {}),
      ...(ciudad && !userCoords ? { ciudad } : {}),
      ...(userCoords ? { lat: String(userCoords.lat), lng: String(userCoords.lng), distancia: String(distancia) } : {}),
      ...(capacidad ? { capacidad } : {}),
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
  }, [fecha, franja, nombre, ciudad, distancia, userCoords, capacidad]);

  // Carga automática inicial de canchas al entrar a la página
  useEffect(() => {
    buscar();
  }, []);

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
        
        {/* ── HEADER ── */}
        <Navbar />

        {/* ── SECCIÓN 1: HERO (Estilo Picadito.app) ── */}
        <section className="w-full px-8 pt-32 pb-12 md:pt-44 md:pb-16 md:px-16 lg:px-24 animate-fade-in relative flex flex-col items-start justify-center">
          <div className="max-w-4xl z-10 relative w-full text-left flex flex-col gap-1 md:gap-2">
            <span className="text-brand font-bold tracking-[0.25em] text-xs md:text-sm uppercase drop-shadow-md">FÚTBOL</span>
            <h1 className="font-display text-[4rem] md:text-[6rem] lg:text-[7.5rem] text-[#F4F7F5] leading-[0.85] tracking-tight mb-4 drop-shadow-2xl uppercase mt-2">
              La cancha<br/>te espera
            </h1>
            <p className="text-white/90 font-medium text-lg md:text-2xl tracking-wide drop-shadow-md text-balance max-w-2xl mt-2 md:mt-4">
              Armá el partido e invitá a los tuyos.<br className="hidden md:block"/> Lo demás se define en la cancha.
            </p>
          </div>
        </section>

        {/* ── CONTENIDO PRINCIPAL: RESULTADOS Y MAPA ── */}
        <main className="flex-1 w-full px-8 md:px-16 lg:px-24 py-12 flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
          
          {/* LISTADO DE RESULTADOS & FILTROS */}
          <section className="w-full lg:w-5/12 flex flex-col gap-6">
            
            {/* BUSCADOR COMPACTO Y FUNCIONAL */}
            <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-7 rounded-[2.5rem] flex flex-col gap-4 w-full">
              
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-white/70 ml-1">Ubicación y Complejo</label>
                
                {/* Input Ubicación (con geolocalización) */}
                <div className="relative w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3.5 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <MapPin className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Ciudad o barrio..."
                    value={ciudad}
                    onChange={(e) => { setCiudad(e.target.value); setUserCoords(null); }}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    aria-label="Ubicación"
                    className="w-full bg-transparent text-white placeholder:text-white/40 text-base focus:outline-none pr-10"
                  />
                  <button onClick={obtenerUbicacion} disabled={geoLoading} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl transition-colors ${userCoords ? 'text-brand' : 'text-white/50 hover:text-brand'}`} title="Usar mi ubicación actual">
                    {geoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
                  </button>
                </div>

                {/* Input Nombre del Complejo o Cancha */}
                <div className="w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3.5 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <Search className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Nombre del complejo o cancha..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    aria-label="Nombre del complejo"
                    className="w-full bg-transparent text-white placeholder:text-white/40 text-base focus:outline-none"
                  />
                </div>
              </div>

              {/* Filtros Secundarios */}
              <div className="flex flex-col sm:flex-row gap-4 mt-1">
                {/* Distancia */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60">Radio máximo</label>
                    <span className="text-xs font-black text-brand">{distancia} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={distancia} 
                    onChange={(e) => setDistancia(Number(e.target.value))}
                    className="w-full accent-brand h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Tipo de Cancha */}
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60 px-1">Tipo de cancha</label>
                  <div className="w-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-4 py-2.5 flex items-center focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                    <select
                      value={capacidad}
                      onChange={(e) => setCapacidad(e.target.value)}
                      aria-label="Tipo de cancha"
                      className="w-full bg-transparent text-white text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="text-black">Todas las medidas</option>
                      <option value="10" className="text-black">Fútbol 5 (10 jugadores)</option>
                      <option value="14" className="text-black">Fútbol 7 (14 jugadores)</option>
                      <option value="22" className="text-black">Fútbol 11 (22 jugadores)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <div className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <Calendar className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <input
                    type="date"
                    value={fecha}
                    min={hoy}
                    onChange={(e) => setFecha(e.target.value)}
                    aria-label="Fecha de la reserva"
                    className="w-full bg-transparent text-white text-sm focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-5 py-3 flex items-center gap-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                  <Clock className="w-5 h-5 text-white/50 shrink-0" aria-hidden="true" />
                  <select
                    value={franja?.inicio || ""}
                    onChange={(e) => {
                      const f = FRANJAS_HORARIAS.find(x => x.inicio === e.target.value);
                      setFranja(f || null);
                    }}
                    aria-label="Horario de inicio"
                    className="w-full bg-transparent text-white text-sm focus:outline-none appearance-none cursor-pointer"
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
                disabled={cargando}
                aria-label="Buscar canchas disponibles"
                className="w-full mt-2 bg-brand hover:bg-brand-hover text-surface font-black text-base px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(69,228,148,0.3)] hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
              >
                {cargando ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Search className="w-5 h-5" aria-hidden="true" />}
                Buscar Canchas
              </button>
            </div>

            {/* Cabecera de resultados */}
            <div className="flex items-center justify-between mt-2">
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">
                Canchas disponibles
              </h2>
              {!cargando && (
                <span className="text-xs font-black text-brand bg-brand/10 border border-brand/20 backdrop-blur-md px-3.5 py-1.5 rounded-full">
                  {canchas.length} {canchas.length === 1 ? "resultado" : "resultados"}
                </span>
              )}
            </div>

            {cargando && (
              <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center h-[260px] text-center p-8 shadow-xl">
                <Loader2 className="w-10 h-10 animate-spin text-brand mb-3" />
                <p className="text-white font-bold">Buscando las mejores canchas...</p>
              </div>
            )}

            {!cargando && canchas.length === 0 && (
              <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center h-[260px] text-center p-8 shadow-xl">
                <SlidersHorizontal className="w-10 h-10 text-white/30 mb-3" aria-hidden="true" />
                <p className="text-white font-bold text-lg">No encontramos canchas con estos filtros.</p>
                <p className="text-white/60 text-sm mt-1 text-balance">Probá ampliando el radio de búsqueda o cambiando el horario.</p>
              </div>
            )}

            {/* Tarjetas de Canchas */}
            <div className="flex flex-col gap-4">
              {canchas.map((cancha) => {
                const tipoCancha =
                  cancha.capacidad <= 10
                    ? "Fútbol 5"
                    : cancha.capacidad <= 14
                    ? "Fútbol 7"
                    : "Fútbol 11";

                return (
                  <div
                    key={cancha.id}
                    onClick={() => setCanchaSeleccionada(cancha.id)}
                    className={`group p-6 rounded-[2rem] border transition-all duration-200 cursor-pointer ${
                      canchaSeleccionada === cancha.id
                        ? "border-brand bg-brand/15 backdrop-blur-xl shadow-[0_0_25px_rgba(69,228,148,0.2)] ring-1 ring-brand"
                        : "border-white/10 bg-[#0f1712]/90 backdrop-blur-xl hover:border-brand/50 hover:bg-[#0f1712] shadow-xl hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Info de Cancha y Predio */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/30">
                            {tipoCancha}
                          </span>
                          {cancha.horarioApertura && (
                            <span className="text-[10px] text-white/50 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-white/40" /> {cancha.horarioApertura} - {cancha.horarioCierre}
                            </span>
                          )}
                        </div>

                        <h3 className="font-display font-black text-white text-2xl truncate group-hover:text-brand transition-colors uppercase tracking-wide">
                          {cancha.nombre}
                        </h3>
                        
                        <p className="text-sm font-bold text-white/80 truncate flex items-center gap-1.5 mt-1">
                          <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {cancha.predio.nombre}
                        </p>
                        <p className="text-xs text-white/50 truncate ml-5.5 mt-0.5">{cancha.predio.direccion}</p>
                      </div>

                      {/* Precio y Botón de Reserva */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                        <div className="flex flex-col sm:items-end">
                          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Turno por hora</span>
                          <span className="text-2xl font-mono font-black text-brand drop-shadow-sm">
                            ${cancha.precioTurno.toLocaleString("es-AR")}
                          </span>
                        </div>

                        <Link
                          href={`/predio/${cancha.predio.id}`}
                          className="bg-white/10 hover:bg-brand text-white hover:text-surface font-black px-5 py-2.5 rounded-full text-xs flex items-center gap-1.5 transition-all shadow-sm group/btn"
                        >
                          <span>Ver Cancha</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* MAPA INTERACTIVO */}
          <section className="w-full lg:w-7/12 min-h-[420px] lg:h-auto">
            <div className="sticky top-28 w-full h-[420px] lg:h-[calc(100vh-160px)] rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10 bg-[#0f1712]/90 backdrop-blur-3xl">
              <MapaDisponibilidad predios={prediosUnicos} canchaSeleccionada={canchaSeleccionada} />
            </div>
          </section>

        </main>
        
        {/* ── SECCIÓN CTA: REGISTRÁ TU PREDIO ── */}
        <section className="w-full relative z-10 mt-8">
          <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex flex-col gap-3 max-w-2xl relative z-10">
              <h2 className="text-3xl md:text-5xl font-display uppercase tracking-tight text-white drop-shadow-sm">
                ¿Tenés un <span className="text-brand">complejo deportivo?</span>
              </h2>
              <p className="text-white/70 text-lg md:text-xl text-balance mt-2">
                Sumate a PicaditoYa y automatizá tus turnos. Conseguí más reservas y olvidate de los mensajes de WhatsApp.
              </p>
            </div>

            <div className="shrink-0 relative z-10 w-full md:w-auto mt-4 md:mt-0">
              <Link 
                href="/registrar-cancha"
                className="bg-brand hover:bg-brand-hover text-surface font-bold text-lg px-10 py-5 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white outline-none w-full md:w-auto text-center shadow-[0_0_20px_rgba(69,228,148,0.3)]"
              >
                Registrar Cancha
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}

