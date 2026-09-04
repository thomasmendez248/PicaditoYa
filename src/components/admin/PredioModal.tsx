"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Building2, MapPin, Phone, Loader2, Plus, Search, Crosshair, Trash2, CheckCircle2, ShieldAlert, Map as MapIcon, Image as ImageIcon } from "lucide-react";
import { useAdmin, PredioAdmin } from "./AdminContext";
import MapaPickerPredio from "./MapaPickerPredio";

export default function PredioModal({
  isOpen,
  onClose,
  predio,
}: {
  isOpen: boolean;
  onClose: () => void;
  predio?: PredioAdmin | null;
}) {
  const { refetchPredios, setSelectedPredioId, predios } = useAdmin();
  const isEditing = !!predio?.id;

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [latitud, setLatitud] = useState<number>(-31.64999);
  const [longitud, setLongitud] = useState<number>(-63.90408);
  const [politicaCancelacionHoras, setPoliticaCancelacionHoras] = useState<number>(24);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [buscandoGeo, setBuscandoGeo] = useState(false);
  const [geoExito, setGeoExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (predio) {
      setNombre(predio.nombre || "");
      setDireccion(predio.direccion || "");
      setTelefono(predio.telefono || "");
      setImagenUrl(predio.imagenUrl || "");
      setLatitud(predio.latitud ?? -31.64999);
      setLongitud(predio.longitud ?? -63.90408);
      setPoliticaCancelacionHoras(predio.politicaCancelacionHoras ?? 24);
    } else {
      setNombre("");
      setDireccion("");
      setTelefono("");
      setImagenUrl("");
      setLatitud(-31.64999);
      setLongitud(-63.90408);
      setPoliticaCancelacionHoras(24);
    }
    setError(null);
    setGeoExito(null);
  }, [predio, isOpen]);

  // Manejar selección desde el mapa interactivo
  const handleMapLocationSelect = useCallback((lat: number, lng: number, suggestedAddress?: string) => {
    setLatitud(lat);
    setLongitud(lng);
    if (suggestedAddress) {
      setDireccion(suggestedAddress);
      setGeoExito(`Dirección actualizada desde el mapa: ${suggestedAddress}`);
    } else {
      setGeoExito(`Ubicación seleccionada: Lat ${lat}, Lng ${lng}`);
    }
    setError(null);
  }, []);

  if (!isOpen) return null;

  // Buscar coordenadas a partir de la dirección escrita
  const buscarCoordenadasPorDireccion = async () => {
    if (!direccion || direccion.trim().length < 3) {
      setError("Ingresá una dirección para buscar sus coordenadas");
      return;
    }

    setBuscandoGeo(true);
    setError(null);
    setGeoExito(null);

    try {
      // Usamos Nominatim OpenStreetMap para geocodificar la dirección
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&countrycodes=ar&limit=1`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "es",
        },
      });

      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        setLatitud(Number(newLat.toFixed(6)));
        setLongitud(Number(newLng.toFixed(6)));
        setGeoExito(`Coordenadas ubicadas: ${item.display_name.slice(0, 50)}...`);
      } else {
        setError("No se encontraron coordenadas para esa dirección. Podés ingresarlas manualmente o usar el GPS.");
      }
    } catch {
      setError("Error al consultar el servicio de mapas.");
    } finally {
      setBuscandoGeo(false);
    }
  };

  // Obtener ubicación GPS del dispositivo
  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización");
      return;
    }

    setBuscandoGeo(true);
    setError(null);
    setGeoExito(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(Number(pos.coords.latitude.toFixed(6)));
        setLongitud(Number(pos.coords.longitude.toFixed(6)));
        setGeoExito("¡Ubicación GPS actual detectada correctamente!");
        setBuscandoGeo(false);
      },
      () => {
        setError("No se pudo obtener la ubicación GPS. Verificá los permisos del navegador.");
        setBuscandoGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono || telefono.trim().length < 6) {
      setError("El teléfono de contacto de la cancha / predio es obligatorio (mínimo 6 dígitos).");
      return;
    }

    setCargando(true);
    setError(null);

    const payload = {
      nombre,
      direccion,
      telefono: telefono.trim(),
      imagenUrl: imagenUrl.trim() || null,
      latitud: Number(latitud),
      longitud: Number(longitud),
      politicaCancelacionHoras: Number(politicaCancelacionHoras),
    };

    try {
      const url = isEditing ? `/api/admin/predios/${predio.id}` : "/api/admin/predios";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el predio");
      }

      await refetchPredios();
      if (data.predio?.id) {
        setSelectedPredioId(data.predio.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al procesar los datos");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = async () => {
    if (!predio?.id) return;
    const confirm = window.confirm(
      `¿Estás seguro de que deseás eliminar el complejo "${predio.nombre}"? Se eliminarán todas sus canchas y turnos asociados.`
    );
    if (!confirm) return;

    setEliminando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/predios/${predio.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar el predio");
      }

      await refetchPredios();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-wide">
                {isEditing ? "Editar Complejo / Predio" : "Nuevo Complejo / Predio"}
              </h2>
              <p className="text-xs text-white/60">
                {isEditing ? "Actualizá la dirección, nombre o datos de contacto" : "Crear una nueva sede o complejo deportivo"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {geoExito && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{geoExito}</span>
            </div>
          )}

          {/* Nombre del predio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Nombre del Complejo *</label>
            <input
              type="text"
              required
              placeholder="Ej: Complejo Los Troncos"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
            />
          </div>

          {/* Foto del predio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Foto del Complejo (URL opcional)</label>
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
              />
            </div>
            {imagenUrl && (
              <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagenUrl} alt="Vista previa del complejo" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Dirección con botón de autocompletar coordenadas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60">Dirección Completa *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarMapa(!mostrarMapa)}
                  className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 transition-colors"
                >
                  <MapIcon className="w-3 h-3" />
                  {mostrarMapa ? "Ocultar Mapa" : "Elegir en Mapa"}
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={buscarCoordenadasPorDireccion}
                  disabled={buscandoGeo}
                  className="text-[11px] font-bold text-white/70 hover:text-brand hover:underline flex items-center gap-1 transition-colors"
                >
                  {buscandoGeo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Buscar texto
                </button>
              </div>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                required
                placeholder="Ej: Av. San Martín 1234, Río Cuarto"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Selector de Ubicación en el Mapa Interactivo */}
          {mostrarMapa && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <MapaPickerPredio
                latitud={latitud}
                longitud={longitud}
                onLocationSelect={handleMapLocationSelect}
              />
            </div>
          )}

          {/* Coordenadas GPS */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">Coordenadas en Mapa</span>
              <button
                type="button"
                onClick={obtenerUbicacionGPS}
                disabled={buscandoGeo}
                className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-brand border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Usar mi GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-white/50 mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitud}
                  onChange={(e) => setLatitud(Number(e.target.value))}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/50 mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitud}
                  onChange={(e) => setLongitud(Number(e.target.value))}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Teléfono y Cancelación */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Teléfono de la Cancha / WhatsApp * <span className="text-brand font-black">(Obligatorio)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="tel"
                  required
                  placeholder="Ej: 3584123456"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">Cancelación (horas)</label>
              <input
                type="number"
                min="0"
                value={politicaCancelacionHoras}
                onChange={(e) => setPoliticaCancelacionHoras(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand text-white"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            {isEditing && predios.length > 1 ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={eliminando || cargando}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar Predio
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-full border border-white/10 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando || eliminando}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black px-7 py-3 rounded-full text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(69,228,148,0.3)] hover:scale-105"
              >
                {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isEditing ? "Guardar Cambios" : "Crear Predio"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
