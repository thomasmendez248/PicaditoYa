"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Search,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  Crosshair,
  Building2,
  TrendingUp,
  Zap,
  Shield,
  Star,
  Users,
  BarChart3,
  Wallet,
  LineChart,
  Compass,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PROVINCIAS_ARGENTINAS = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const MapaDisponibilidad = dynamic(
  () => import("@/components/map/MapaDisponibilidad"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-surface-hover">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    ),
  }
);

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
    imagenUrl?: string | null;
  };
};

const BENEFICIOS_DUENOS = [
  {
    icon: TrendingUp,
    titulo: "Tu agenda, en piloto automatico",
    descripcion: "Olvida el telefono. Tus canchas se reservan solas, de dia y de noche, sin que levantes un dedo.",
  },
  {
    icon: LineChart,
    titulo: "Sabe exactamente que te conviene",
    descripcion: "Que cancha rinde mas, que horario llena primero, cuanto generas por mes. Todo en un panel, sin hojas de calculo.",
  },
  {
    icon: Wallet,
    titulo: "La plata llega antes que el jugador",
    descripcion: "Cobro anticipado via MercadoPago. Si no pagan, no reservan. Los no-shows desaparecen.",
  },
  {
    icon: Zap,
    titulo: "Hoy lo configuras, manana ya cobras",
    descripcion: "Carga tus canchas, pone los precios y arranca. Sin tecnico, sin contrato, sin vuelta.",
  },
  {
    icon: Users,
    titulo: "Conoce a cada jugador de tu predio",
    descripcion: "Historial completo por cliente: cuantas veces vino, si aparecio, que canchas elige. Datos que antes no tenias.",
  },
  {
    icon: Star,
    titulo: "El primero que aparece en el mapa",
    descripcion: "Tu complejo visible para miles de jugadores activos en tu zona antes de que busquen el de la competencia.",
  },
];

export default function HomePage() {
  const hoy = format(new Date(), "yyyy-MM-dd");

  const [nombre, setNombre] = useState("");
  const [provincia, setProvincia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [distancia] = useState(5);
  const [capacidad, setCapacidad] = useState<string>("");
  const [fecha, setFecha] = useState(hoy);

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(false);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const obtenerUbicacion = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCiudad("Mi ubicacion");
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        alert("No se pudo obtener tu ubicacion. Verifica los permisos del navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const buscar = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams({
      ...(fecha ? { fecha } : {}),
      ...(nombre ? { nombre } : {}),
      ...(provincia ? { provincia } : {}),
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
  }, [fecha, nombre, provincia, ciudad, distancia, userCoords, capacidad]);

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prediosUnicos = Array.from(
    new Map(canchas.map((c) => [c.predio.id, c.predio])).values()
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-text-main overflow-x-hidden relative">
      {/* Fondo */}
      <div className="fixed inset-0 -z-20">
        <Image src="/hero-bg.jpg" alt="" fill priority quality={80} sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-surface/92" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Navbar />

        {/* ══════════════════════════════════════════
            HERO: Texto izquierdo + Buscador abajo
        ══════════════════════════════════════════ */}
        <section className="w-full px-8 sm:px-12 lg:px-20 pt-32 pb-10 md:pt-44 md:pb-14 animate-fade-in">
          {/* Titulo alineado a la izquierda */}
          <div className="max-w-4xl flex flex-col gap-1 md:gap-2 mb-10">
            <span className="text-brand font-bold tracking-[0.25em] text-xs md:text-sm uppercase drop-shadow-md">
              FUTBOL
            </span>
            <h1 className="font-display text-[4rem] md:text-[6rem] lg:text-[7.5rem] text-[#F4F7F5] leading-[0.85] tracking-tight drop-shadow-2xl uppercase mt-2">
              La cancha<br />te espera
            </h1>
            <p className="text-white/80 font-medium text-lg md:text-xl tracking-wide drop-shadow-md text-balance max-w-xl mt-3 md:mt-4">
              Arma el partido e invita a los tuyos.<br className="hidden md:block" /> Lo demas se define en la cancha.
            </p>
          </div>

          {/* Buscador horizontal centrado y con mayor presencia */}
          <div className="w-full max-w-6xl mx-auto mt-2">
            <div className="bg-[#0d1510]/92 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="flex flex-col md:flex-row items-stretch p-2.5 sm:p-3 gap-0">
                {/* Complejo */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 px-5 py-3.5 sm:py-4 border-b md:border-b-0 md:border-r border-white/8">
                  <label htmlFor="search-complejo" className="text-xs font-black uppercase tracking-wider text-white/60">Complejo</label>
                  <div className="flex items-center gap-2.5">
                    <Search className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
                    <input id="search-complejo" type="text" placeholder="Nombre del complejo..." value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} autoComplete="off" spellCheck={false} aria-label="Nombre del complejo" className="w-full bg-transparent text-white placeholder:text-white/35 text-base focus:outline-none" />
                  </div>
                </div>
                {/* Provincia */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 px-5 py-3.5 sm:py-4 border-b md:border-b-0 md:border-r border-white/8">
                  <label htmlFor="search-provincia" className="text-xs font-black uppercase tracking-wider text-white/60">Provincia</label>
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
                    <select
                      id="search-provincia"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      aria-label="Seleccionar provincia"
                      className="w-full bg-transparent text-white text-base focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0d1510] text-white">Todas las provincias</option>
                      {PROVINCIAS_ARGENTINAS.map((prov) => (
                        <option key={prov} value={prov} className="bg-[#0d1510] text-white">
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Localidad */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 px-5 py-3.5 sm:py-4 border-b md:border-b-0 md:border-r border-white/8">
                  <label htmlFor="search-localidad" className="text-xs font-black uppercase tracking-wider text-white/60">Localidad</label>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
                    <input id="search-localidad" type="text" placeholder="Donde?..." value={ciudad} onChange={(e) => { setCiudad(e.target.value); setUserCoords(null); }} onKeyDown={(e) => e.key === "Enter" && buscar()} autoComplete="off" aria-label="Ciudad o barrio" className="w-full bg-transparent text-white placeholder:text-white/35 text-base focus:outline-none" />
                    <button onClick={obtenerUbicacion} disabled={geoLoading} aria-label="Usar mi ubicacion actual" title="Usar mi ubicacion" className={`shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-brand focus:outline-none ${userCoords ? "text-brand" : "text-white/40 hover:text-brand"}`}>
                      {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Crosshair className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {/* Fecha */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 px-5 py-3.5 sm:py-4 border-b md:border-b-0 md:border-r border-white/8">
                  <label htmlFor="search-fecha" className="text-xs font-black uppercase tracking-wider text-white/60">Fecha</label>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-white/40 shrink-0" aria-hidden="true" />
                    <input id="search-fecha" type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de la reserva" className="w-full bg-transparent text-white text-base focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>
                {/* Boton (manteniendo el mismo tamaño solicitado) */}
                <div className="flex items-center justify-center px-3 py-2 md:py-0">
                  <button onClick={buscar} disabled={cargando} aria-label="Buscar canchas disponibles" id="btn-buscar-canchas" className="whitespace-nowrap bg-brand hover:bg-brand-hover text-surface font-black text-sm px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(76,175,125,0.35)] hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white focus:outline-none w-full md:w-auto justify-center">
                    {cargando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
                    Buscar canchas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MAPA (IZQUIERDA CIRCULAR) + RESULTADOS (DERECHA)
        ══════════════════════════════════════════ */}
        <main id="resultados-canchas" className="w-full px-8 sm:px-12 lg:px-20 pb-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* MAPA CIRCULAR — lado izquierdo, sticky */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-28">
              <div className="aspect-square w-full max-w-[380px] xl:max-w-[420px] mx-auto lg:mx-0 rounded-full overflow-hidden ring-2 ring-brand/25 shadow-[0_0_60px_rgba(76,175,125,0.15)]">
                <MapaDisponibilidad predios={prediosUnicos} canchaSeleccionada={canchaSeleccionada} />
              </div>
              {prediosUnicos.length > 0 && (
                <p className="text-center text-white/40 text-xs mt-3 font-semibold">
                  {prediosUnicos.length} {prediosUnicos.length === 1 ? "complejo en el mapa" : "complejos en el mapa"}
                </p>
              )}
            </div>

            {/* RESULTADOS — lado derecho */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Cabecera */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wide">
                  Canchas disponibles
                </h2>
                {!cargando && (
                  <span className="text-xs font-black text-brand bg-brand/10 border border-brand/20 backdrop-blur-md px-3.5 py-1.5 rounded-full shrink-0">
                    {canchas.length} {canchas.length === 1 ? "resultado" : "resultados"}
                  </span>
                )}
              </div>

              {/* Estado cargando */}
              {cargando && (
                <div className="bg-[#0d1510]/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center h-48 shadow-xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-brand" aria-hidden="true" />
                    <p className="text-white font-bold">Buscando las mejores canchas...</p>
                  </div>
                </div>
              )}

              {/* Sin resultados */}
              {!cargando && canchas.length === 0 && (
                <div className="bg-[#0d1510]/90 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center justify-center h-48 text-center p-8 shadow-xl">
                  <SlidersHorizontal className="w-10 h-10 text-white/30 mb-3" aria-hidden="true" />
                  <p className="text-white font-bold text-lg">No encontramos canchas con estos filtros.</p>
                  <p className="text-white/60 text-sm mt-1 text-balance">Probá seleccionando otra localidad o provincia.</p>
                </div>
              )}

              {/* Tarjetas: Si son 3 o más canchas, en grid vertical de hasta 3 por fila; si son menos de 3, una debajo de otra */}
              {!cargando && canchas.length > 0 && (
                canchas.length >= 3 ? (
                  /* ── GRID VERTICAL (3 canchas por fila máx) ── */
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {canchas.map((cancha) => {
                      const tipoCancha =
                        cancha.capacidad <= 10
                          ? "Fútbol 5"
                          : cancha.capacidad <= 14
                          ? "Fútbol 7"
                          : "Fútbol 11";
                      const fotoPredio =
                        cancha.predio.imagenUrl ||
                        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop";
                      const nombreCanchaLimpio =
                        cancha.nombre.charAt(0).toUpperCase() + cancha.nombre.slice(1);

                      return (
                        <Link
                          key={cancha.id}
                          href={`/predio/${cancha.predio.id}`}
                          onMouseEnter={() => setCanchaSeleccionada(cancha.id)}
                          onMouseLeave={() => setCanchaSeleccionada(null)}
                          aria-label={`Ver detalles y turnos de ${nombreCanchaLimpio} en ${cancha.predio.nombre}`}
                          className="group flex flex-col justify-between bg-[#0d1510]/92 backdrop-blur-xl border border-white/10 hover:border-brand/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(76,175,125,0.2)] hover:scale-[1.015] transition-all duration-300 cursor-pointer"
                        >
                          {/* Foto vertical (arriba) */}
                          <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fotoPredio}
                              alt={`Complejo ${cancha.predio.nombre}`}
                              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                            <div className="absolute top-3 left-3">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-brand border border-brand/40 shadow-lg">
                                {tipoCancha}
                              </span>
                            </div>
                            {cancha.horarioApertura && (
                              <div className="absolute bottom-3 right-3">
                                <span className="text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-brand" aria-hidden="true" />
                                  {cancha.horarioApertura}–{cancha.horarioCierre}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info y Contenido */}
                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-black text-brand uppercase tracking-wider">
                                Complejo Deportivo
                              </span>
                              <h3 className="font-display font-black text-white text-xl group-hover:text-brand transition-colors uppercase tracking-wide truncate">
                                {cancha.predio.nombre}
                              </h3>
                              <p className="text-sm font-semibold text-white/90 truncate">
                                {nombreCanchaLimpio}
                              </p>
                              <p className="text-xs text-white/60 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden="true" />
                                {cancha.predio.direccion}
                              </p>
                            </div>

                            {/* Precio y Botón CTA */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/8 mt-auto">
                              <div>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">
                                  Por turno
                                </span>
                                <span className="text-xl font-mono font-black text-brand">
                                  ${cancha.precioTurno.toLocaleString("es-AR")}
                                </span>
                              </div>

                              <div className="bg-brand/15 group-hover:bg-brand text-brand group-hover:text-surface font-black px-4 py-2 rounded-full text-xs flex items-center gap-1 transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(76,175,125,0.4)]">
                                <span>Ver predio</span>
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* ── LISTADO HORIZONTAL (< 3 canchas, una debajo de otra) ── */
                  <div className="flex flex-col gap-4">
                    {canchas.map((cancha) => {
                      const tipoCancha =
                        cancha.capacidad <= 10
                          ? "Fútbol 5"
                          : cancha.capacidad <= 14
                          ? "Fútbol 7"
                          : "Fútbol 11";
                      const fotoPredio =
                        cancha.predio.imagenUrl ||
                        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop";
                      const nombreCanchaLimpio =
                        cancha.nombre.charAt(0).toUpperCase() + cancha.nombre.slice(1);

                      return (
                        <Link
                          key={cancha.id}
                          href={`/predio/${cancha.predio.id}`}
                          onMouseEnter={() => setCanchaSeleccionada(cancha.id)}
                          onMouseLeave={() => setCanchaSeleccionada(null)}
                          aria-label={`Ver detalles y turnos de ${nombreCanchaLimpio} en ${cancha.predio.nombre}`}
                          className="group flex flex-col sm:flex-row items-stretch bg-[#0d1510]/92 backdrop-blur-xl border border-white/10 hover:border-brand/60 rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(76,175,125,0.2)] hover:scale-[1.008] transition-all duration-300 cursor-pointer"
                        >
                          {/* Foto del Predio */}
                          <div className="relative w-full sm:w-56 md:w-64 h-48 sm:h-auto min-h-[170px] shrink-0 overflow-hidden bg-black/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fotoPredio}
                              alt={`Complejo ${cancha.predio.nombre}`}
                              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                            <div className="absolute top-3 left-3">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-brand border border-brand/40 shadow-lg">
                                {tipoCancha}
                              </span>
                            </div>
                          </div>

                          {/* Info y Contenido */}
                          <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 gap-3 min-w-0">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-brand uppercase tracking-wider">
                                  Complejo Deportivo
                                </span>
                                {cancha.horarioApertura && (
                                  <span className="text-[11px] text-white/50 flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-brand/70" aria-hidden="true" />
                                    {cancha.horarioApertura}–{cancha.horarioCierre}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-display font-black text-white text-2xl group-hover:text-brand transition-colors uppercase tracking-wide truncate">
                                {cancha.predio.nombre}
                              </h3>

                              <p className="text-sm font-semibold text-white/90 truncate">
                                {nombreCanchaLimpio}
                              </p>

                              <p className="text-xs text-white/60 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden="true" />
                                {cancha.predio.direccion}
                              </p>
                            </div>

                            {/* Precio y Botón CTA hacia el detalle */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/8 mt-1">
                              <div>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">
                                  Por turno
                                </span>
                                <span className="text-2xl font-mono font-black text-brand">
                                  ${cancha.precioTurno.toLocaleString("es-AR")}
                                </span>
                              </div>

                              <div className="bg-brand/15 group-hover:bg-brand text-brand group-hover:text-surface font-black px-5 py-2.5 rounded-full text-xs flex items-center gap-1.5 transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(76,175,125,0.4)]">
                                <span>Ver predio y turnos</span>
                                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              )}
            </div>

          </div>
        </main>

        {/* ══════════════════════════════════════════
            SECCION COMPLETA: PARA DUENOS — ANCHO TOTAL
        ══════════════════════════════════════════ */}
        <section className="w-full relative z-10" aria-labelledby="duenos-titulo">
          <div className="w-full bg-[#070e09]/96 backdrop-blur-2xl border-y border-white/8 relative overflow-hidden">

            {/* Brillos de fondo */}
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-brand/8 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-[80px] pointer-events-none" />

            {/* Encabezado CTA — ancho completo con padding */}
            <div className="relative z-10 px-8 sm:px-12 lg:px-20 pt-16 pb-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/15 border border-brand/30 text-brand text-xs font-black tracking-widest uppercase w-fit">
                  <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Para Complejos Deportivos</span>
                </div>
                <h2 id="duenos-titulo" className="text-4xl sm:text-5xl md:text-6xl font-display uppercase tracking-tight text-white drop-shadow-md leading-[0.9]">
                  Tenes un<br /><span className="text-brand">complejo deportivo?</span>
                </h2>
                <p className="text-white/60 text-base md:text-lg text-balance leading-relaxed max-w-xl">
                  Para de perder plata con turnos sin cobrar y chats de WhatsApp que no terminan. PicaditoYa te da el sistema que necesitabas desde el primer dia.
                </p>
              </div>
              <div className="shrink-0 w-full lg:w-auto flex flex-col items-start lg:items-end gap-3">
                <Link
                  href="/registrar-cancha"
                  className="bg-brand hover:bg-brand-hover text-surface font-black text-base md:text-lg px-9 py-5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white outline-none w-full lg:w-auto text-center shadow-[0_0_40px_rgba(76,175,125,0.4)]"
                >
                  <span>Registrar mi Cancha</span>
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <p className="text-white/35 text-xs text-center lg:text-right">Sin costo de alta — Configuras en minutos</p>
              </div>
            </div>

            {/* Divisor */}
            <div className="w-full h-px bg-white/6 mx-0" />

            {/* Grid de beneficios — ancho completo con padding */}
            <div className="relative z-10 px-8 sm:px-12 lg:px-20 py-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/6 rounded-2xl overflow-hidden border border-white/8">
                {BENEFICIOS_DUENOS.map((beneficio, idx) => {
                  const Icon = beneficio.icon;
                  return (
                    <div
                      key={beneficio.titulo}
                      className={`bg-[#070e09]/98 p-7 flex flex-col gap-3 hover:bg-[#0d1a10]/80 transition-colors group ${idx === BENEFICIOS_DUENOS.length - 1 && BENEFICIOS_DUENOS.length % 3 !== 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand/12 border border-brand/20 flex items-center justify-center group-hover:bg-brand/22 transition-colors">
                        <Icon className="w-5 h-5 text-brand" aria-hidden="true" />
                      </div>
                      <h3 className="text-white font-black text-base leading-tight">{beneficio.titulo}</h3>
                      <p className="text-white/48 text-sm leading-relaxed">{beneficio.descripcion}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
