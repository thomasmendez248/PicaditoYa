"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

type Predio = {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
};

type Props = {
  predios: Predio[];
  canchaSeleccionada: string | null;
};

// Centro default: Buenos Aires, Argentina
const DEFAULT_CENTER: [number, number] = [-58.3816, -34.6037];
const DEFAULT_ZOOM = 11;

export default function MapaDisponibilidad({ predios, canchaSeleccionada }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [tokenFaltante, setTokenFaltante] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setTokenFaltante(true);
      return;
    }

    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Actualizar markers cuando cambian los predios
  useEffect(() => {
    if (!map.current) return;

    // Limpiar markers anteriores
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    if (predios.length === 0) return;

    predios.forEach((predio) => {
      // Crear elemento HTML personalizado para el marker
      const el = document.createElement("div");
      el.className = "mapbox-marker group";
      el.innerHTML = `
        <div class="marker-pin transition-transform group-hover:scale-110">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#4CAF50" class="shadow-sm"/>
            <path d="M12 6C9.79 6 8 7.79 8 10C8 13.5 12 18 12 18C12 18 16 13.5 16 10C16 7.79 14.21 6 12 6ZM12 11.5C11.17 11.5 10.5 10.83 10.5 10C10.5 9.17 11.17 8.5 12 8.5C12.83 8.5 13.5 9.17 13.5 10C13.5 10.83 12.83 11.5 12 11.5Z" fill="#141F16"/>
          </svg>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: "mapbox-popup-dark",
        closeButton: false,
        maxWidth: "240px",
      }).setHTML(`
        <div style="padding: 12px; background: #223326; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3); border: 1px solid #304535;">
          <p style="font-weight: 700; color: #F4F7F5; margin: 0 0 4px; font-size: 14px;">${predio.nombre}</p>
          <p style="color: #9BAA9E; margin: 0 0 12px; font-size: 12px; line-height: 1.4;">${predio.direccion}</p>
          <a href="/predio/${predio.id}" style="display: block; text-align: center; background: #4CAF50; color: #FFFFFF; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#66BB6A'" onmouseout="this.style.background='#4CAF50'">Ver disponibilidad →</a>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([predio.longitud, predio.latitud])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit map to show all markers
    if (predios.length === 1) {
      map.current.flyTo({
        center: [predios[0].longitud, predios[0].latitud],
        zoom: 15,
        duration: 800,
      });
    } else if (predios.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      predios.forEach((p) => bounds.extend([p.longitud, p.latitud]));
      map.current.fitBounds(bounds, { padding: 80, duration: 800 });
    }
  }, [predios]);

  if (tokenFaltante) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-surface gap-4 border border-border rounded-full">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-amber-400" />
        </div>
        <div className="text-center">
          <p className="text-text-main font-semibold">Token de Mapbox no configurado</p>
          <p className="text-text-muted text-sm mt-1 max-w-xs">
            Agregá{" "}
            <code className="text-brand-dark bg-surface-hover px-1 rounded">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            en tu archivo{" "}
            <code className="text-brand-dark bg-surface-hover px-1 rounded">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .mapbox-marker { cursor: pointer; }
        .mapboxgl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
        .mapboxgl-popup-tip { border-top-color: #1B2F22 !important; }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  );
}
