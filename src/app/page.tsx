"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Clock, Calendar, ChevronRight, Loader2, Map as MapIcon, SlidersHorizontal, Crosshair } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

// Carga dinámica del mapa para evitar SSR issues con mapbox-gl
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
        <header className="absolute top-0 left-0 right-0 w-full z-50 flex items-center justify-between px-6 py-6 bg-transparent border-b border-white/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">PicaditoYa</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-1.5 drop-shadow-sm">
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className="text-sm bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-xl font-semibold transition-colors shadow-sm">
              Registrarse
            </Link>
          </nav>
        </header>

        {/* ── SECCIÓN 1: HERO (Textos gigantes e imagen circular) ── */}
        <section className="w-full px-8 pt-24 pb-8 md:pt-28 md:pb-12 md:px-16 lg:px-24 animate-fade-in relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12">
          
          <div className="max-w-2xl z-10 relative shrink-0 w-full text-left">
            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white leading-[0.9] tracking-tighter uppercase mb-6 drop-shadow-xl text-left">
              TU PRÓXIMA<br />CANCHA ESTÁ<br />AQUÍ
            </h1>
            <p className="text-brand-hover font-bold text-lg md:text-xl tracking-tight drop-shadow-md text-left">
              <span className="text-white">Fútbol 5 • Fútbol 7 • Fútbol 11</span><br />
              Torneos • Reservas y mucho más.
            </p>
          </div>

          <div className="z-10 relative flex-1 w-full flex justify-center md:justify-end mt-8 md:mt-0">
            <div className="w-[280px] h-[280px] lg:w-[420px] lg:h-[420px] rounded-full border-8 border-white/10 shadow-[0_0_60px_rgba(76,175,80,0.3)] overflow-hidden transition-transform hover:scale-105 duration-500 bg-surface-card flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/pelota.jpg" 
                alt="Pelota de fútbol dinámica" 
                className="w-full h-full object-cover scale-110"
              />
            </div>
          </div>

        </section>

      {/* ── SECCIÓN 2: ENCONTRÁ TU CANCHA ── */}
      <main className="flex-1 w-full px-4 md:px-8 pb-12 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* COLUMNA IZQUIERDA: FILTROS */}
        <section className="w-full md:w-[380px] shrink-0 space-y-6">
          <div className="bg-surface-card/70 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg">
            <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-brand" />
              Buscador
            </h2>
            
            <div className="space-y-4">
              {/* Filtro Ciudad y Nombre */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-text-muted">Ubicación y Nombre</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Ciudad o barrio..."
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand hover:bg-surface rounded-lg transition-colors" title="Usar mi ubicación actual">
                    <Crosshair className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Nombre del complejo..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Distancia */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-text-muted">Distancia máxima</label>
                  <span className="text-xs font-medium text-brand">{distancia} km</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={distancia} 
                  onChange={(e) => setDistancia(Number(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>

              <hr className="border-border" />

              {/* Fecha y Hora */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-text-muted">Cuándo querés jugar</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="date"
                    value={fecha}
                    min={hoy}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {FRANJAS_HORARIAS.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFranja(f)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all font-medium ${
                        franja?.inicio === f.inicio
                          ? "bg-brand border-brand text-white shadow-sm"
                          : "bg-surface border-border text-text-muted hover:border-brand-hover hover:text-brand"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón Buscar */}
              <button
                onClick={buscar}
                disabled={!franja || cargando}
                className="w-full mt-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {cargando ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Buscando...</>
                ) : (
                  <><Search className="w-5 h-5" /> Encontrar canchas</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: MAPA Y RESULTADOS */}
        <section className="flex-1 flex flex-col gap-8 min-w-0">
          
          {/* Mapa Expandido */}
          <div className="flex flex-col animate-slide-in-left">
            <div className="relative w-full h-[400px] rounded-3xl border-4 border-white shadow-lg overflow-hidden">
              <MapaDisponibilidad predios={prediosUnicos} canchaSeleccionada={canchaSeleccionada} />
            </div>
          </div>

          {/* Turnero / Resultados */}
          <div className="bg-surface-card/70 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg min-h-[300px]">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center justify-between">
              Resultados
              {buscado && !cargando && <span className="text-sm font-normal text-text-muted bg-surface-hover px-3 py-1 rounded-full">{canchas.length} canchas</span>}
            </h3>

            {!buscado && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <SlidersHorizontal className="w-10 h-10 text-brand/30 mb-3" />
                <p className="text-text-muted">Ajustá los filtros y buscá para ver las opciones acá.</p>
              </div>
            )}

            {buscado && !cargando && canchas.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-text-muted font-medium">No hay canchas disponibles cerca de tu ubicación.</p>
                <p className="text-sm text-text-muted mt-1">Intentá ampliando la distancia o cambiando el horario.</p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {canchas.map((cancha) => (
                <Link
                  key={cancha.id}
                  href={`/predio/${cancha.predio.id}`}
                  onClick={() => setCanchaSeleccionada(cancha.id)}
                  className={`flex flex-col p-4 rounded-2xl border transition-all hover:-translate-y-1 ${
                    canchaSeleccionada === cancha.id
                      ? "border-brand bg-brand-dim"
                      : "border-white/10 bg-surface/50 hover:border-brand/50 hover:bg-surface/80 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-text-main text-base">{cancha.nombre}</h4>
                      <p className="text-sm text-text-muted">{cancha.predio.nombre}</p>
                    </div>
                    <div className="bg-surface-hover text-brand font-bold px-3 py-1 rounded-lg border border-border shadow-sm text-sm">
                      ${cancha.precioTurno.toLocaleString("es-AR")}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-text-muted mt-auto pt-3 border-t border-border/50 justify-between">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cancha.predio.direccion}</span>
                    <span className="text-brand font-medium flex items-center">Reservar <ChevronRight className="w-4 h-4 ml-0.5" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

          </main>
      </div>
    </div>
  );
}
