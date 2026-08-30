"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Clock, Calendar, ChevronRight, Star, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

// Carga dinámica del mapa para evitar SSR issues con mapbox-gl
const MapaDisponibilidad = dynamic(() => import("@/components/map/MapaDisponibilidad"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-neutral-900">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
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
  { label: "08:00 - 09:00", inicio: "08:00", fin: "09:00" },
  { label: "09:00 - 10:00", inicio: "09:00", fin: "10:00" },
  { label: "10:00 - 11:00", inicio: "10:00", fin: "11:00" },
  { label: "14:00 - 15:00", inicio: "14:00", fin: "15:00" },
  { label: "15:00 - 16:00", inicio: "15:00", fin: "16:00" },
  { label: "16:00 - 17:00", inicio: "16:00", fin: "17:00" },
  { label: "17:00 - 18:00", inicio: "17:00", fin: "18:00" },
  { label: "18:00 - 19:00", inicio: "18:00", fin: "19:00" },
  { label: "19:00 - 20:00", inicio: "19:00", fin: "20:00" },
  { label: "20:00 - 21:00", inicio: "20:00", fin: "21:00" },
  { label: "21:00 - 22:00", inicio: "21:00", fin: "22:00" },
  { label: "22:00 - 23:00", inicio: "22:00", fin: "23:00" },
];

export default function HomePage() {
  const hoy = format(new Date(), "yyyy-MM-dd");

  const [nombre, setNombre] = useState("");
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
  }, [fecha, franja, nombre]);

  const prediosEnMapa = canchas.map((c) => c.predio);
  const prediosUnicos = prediosEnMapa.filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 overflow-hidden">
      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-neutral-950/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PicaditoYa</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm text-neutral-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
          >
            Registrarse
          </Link>
        </nav>
      </header>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── PANEL IZQUIERDO ── */}
        <aside className="w-[380px] flex flex-col bg-neutral-900 border-r border-white/5 overflow-hidden shrink-0">
          {/* HERO del panel */}
          <div className="px-6 py-6 border-b border-white/5">
            <h1 className="text-2xl font-bold text-white leading-tight">
              Encontrá tu cancha
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Disponibilidad en tiempo real cerca tuyo
            </p>
          </div>

          {/* FILTROS */}
          <div className="px-6 py-5 space-y-4 border-b border-white/5">
            {/* Nombre */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="filtro-nombre"
                type="text"
                placeholder="Nombre de cancha o predio..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Fecha */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="filtro-fecha"
                type="date"
                value={fecha}
                min={hoy}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [color-scheme:dark]"
              />
            </div>

            {/* Franja horaria */}
            <div>
              <p className="text-xs text-neutral-500 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horario deseado
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {FRANJAS_HORARIAS.map((f) => (
                  <button
                    key={f.label}
                    id={`franja-${f.inicio}`}
                    onClick={() => setFranja(f)}
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-all text-center ${
                      franja?.inicio === f.inicio
                        ? "bg-emerald-500 border-emerald-500 text-white font-medium"
                        : "bg-neutral-800 border-white/10 text-neutral-400 hover:border-emerald-500/40 hover:text-white"
                    }`}
                  >
                    {f.inicio}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón buscar */}
            <button
              id="btn-buscar"
              onClick={buscar}
              disabled={!franja || cargando}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar disponibilidad
                </>
              )}
            </button>
          </div>

          {/* RESULTADOS */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {!buscado && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm text-neutral-400 max-w-[200px]">
                  Elegí un horario y buscá las canchas disponibles
                </p>
              </div>
            )}

            {buscado && !cargando && canchas.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <p className="text-sm text-neutral-500">
                  No hay canchas disponibles para ese horario.
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  Probá con otra franja horaria o fecha.
                </p>
              </div>
            )}

            {canchas.map((cancha) => (
              <Link
                key={cancha.id}
                href={`/predio/${cancha.predio.id}`}
                id={`resultado-cancha-${cancha.id}`}
                onClick={() => setCanchaSeleccionada(cancha.id)}
                className={`block p-4 rounded-xl border transition-all cursor-pointer group ${
                  canchaSeleccionada === cancha.id
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-neutral-800/50 border-white/5 hover:border-white/20 hover:bg-neutral-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {cancha.nombre}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {cancha.predio.nombre}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {cancha.predio.direccion}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold text-emerald-400">
                      ${cancha.precioTurno.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {cancha.duracionTurnoMinutos} min
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    Disponible
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* ── MAPA ── */}
        <div className="flex-1 relative">
          <MapaDisponibilidad
            predios={prediosUnicos}
            canchaSeleccionada={canchaSeleccionada}
          />

          {/* Overlay cuando no se buscó aún */}
          {!buscado && (
            <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-white/10 text-white px-5 py-3 rounded-2xl text-sm text-center">
                <p className="font-medium">🗺️ Explorá predios en el mapa</p>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Usá los filtros para ver disponibilidad en tiempo real
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
