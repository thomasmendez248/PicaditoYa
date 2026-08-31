"use client";

import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { MapPin, Navigation, Crosshair, Loader2 } from "lucide-react";

interface MapaPickerPredioProps {
  latitud: number;
  longitud: number;
  onLocationSelect: (lat: number, lng: number, suggestedAddress?: string) => void;
}

export default function MapaPickerPredio({
  latitud,
  longitud,
  onLocationSelect,
}: MapaPickerPredioProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const marker = useRef<maptilersdk.Marker | null>(null);
  const [cargandoGeo, setCargandoGeo] = useState(false);
  const [tokenFaltante, setTokenFaltante] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!key) {
      setTokenFaltante(true);
      return;
    }

    if (!mapContainer.current || map.current) return;

    maptilersdk.config.apiKey = key;

    const initialCenter: [number, number] = [
      longitud || -63.90408,
      latitud || -31.64999,
    ];

    const mapInstance = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`,
      center: initialCenter,
      zoom: 14,
    });

    map.current = mapInstance;

    mapInstance.addControl(
      new maptilersdk.NavigationControl({ showCompass: false }),
      "top-right"
    );

    // Crear marcador personalizado arrastrable
    const markerEl = document.createElement("div");
    markerEl.className = "cursor-grab active:cursor-grabbing hover:scale-110 transition-transform";
    markerEl.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 38px; height: 38px; background: #45E494; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(69, 228, 148, 0.7); border: 2px solid #0B110D;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B110D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div style="width: 8px; height: 8px; background: #45E494; border-radius: 50%; margin-top: 2px; box-shadow: 0 0 10px #45E494;"></div>
      </div>
    `;

    const markerInstance = new maptilersdk.Marker({
      element: markerEl,
      draggable: true,
    })
      .setLngLat(initialCenter)
      .addTo(mapInstance);

    marker.current = markerInstance;

    // Función auxiliar para reverse geocoding
    const handleCoordinateChange = async (lat: number, lng: number) => {
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));

      setCargandoGeo(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "es" } }
        );
        const data = await res.json();
        let suggested = "";
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.pedestrian || a.street || a.neighbourhood || "";
          const num = a.house_number ? ` ${a.house_number}` : "";
          const city = a.city || a.town || a.village || a.municipality || "";
          const state = a.state || "";
          if (road && city) {
            suggested = `${road}${num}, ${city}${state ? `, ${state}` : ""}`;
          } else if (data.display_name) {
            suggested = data.display_name.split(",").slice(0, 3).join(", ");
          }
        }
        onLocationSelect(roundedLat, roundedLng, suggested || undefined);
      } catch {
        onLocationSelect(roundedLat, roundedLng);
      } finally {
        setCargandoGeo(false);
      }
    };

    // Al clickear en el mapa: mover pin y actualizar
    mapInstance.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      markerInstance.setLngLat([lng, lat]);
      handleCoordinateChange(lat, lng);
    });

    // Al arrastrar el pin: actualizar al soltar
    markerInstance.on("dragend", () => {
      const lngLat = markerInstance.getLngLat();
      handleCoordinateChange(lngLat.lat, lngLat.lng);
    });

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Sincronizar marcador y vista si cambian las coordenadas externas (por ejemplo por GPS o búsqueda de texto)
  useEffect(() => {
    if (!map.current || !marker.current || !latitud || !longitud) return;

    const currentLngLat = marker.current.getLngLat();
    const diffLat = Math.abs(currentLngLat.lat - latitud);
    const diffLng = Math.abs(currentLngLat.lng - longitud);

    // Solo mover si la diferencia es perceptible (para no ciclar eventos)
    if (diffLat > 0.0001 || diffLng > 0.0001) {
      marker.current.setLngLat([longitud, latitud]);
      map.current.flyTo({
        center: [longitud, latitud],
        zoom: Math.max(map.current.getZoom(), 15),
        duration: 800,
      });
    }
  }, [latitud, longitud]);

  if (tokenFaltante) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 text-center">
        API Key de MapTiler no encontrada. Podés ingresar las coordenadas manualmente.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-brand" />
          Hacé click o arrastrá el pin en el mapa
        </span>
        {cargandoGeo && (
          <span className="text-[10px] text-brand font-bold flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Obteniendo dirección...
          </span>
        )}
      </div>

      <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-white/15 shadow-inner group">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Overlay de ayuda en la esquina inferior izquierda */}
        <div className="absolute bottom-2.5 left-2.5 bg-[#0f1712]/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-lg pointer-events-none">
          <p className="text-[10px] font-mono text-white/70">
            Lat: <span className="text-brand font-bold">{latitud.toFixed(5)}</span> • Lng: <span className="text-brand font-bold">{longitud.toFixed(5)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
