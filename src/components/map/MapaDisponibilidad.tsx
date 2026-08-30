"use client";

import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
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

// Centro default: Río Cuarto, Córdoba, Argentina (coordenadas del visor proporcionado)
const DEFAULT_CENTER: [number, number] = [-63.90408, -31.64999];
const DEFAULT_ZOOM = 14;

export default function MapaDisponibilidad({ predios, canchaSeleccionada }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const markers = useRef<maptilersdk.Marker[]>([]);
  const [tokenFaltante, setTokenFaltante] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!key) {
      setTokenFaltante(true);
      return;
    }

    if (!mapContainer.current || map.current) return;

    maptilersdk.config.apiKey = key;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(
      new maptilersdk.NavigationControl({ showCompass: false }),
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
      el.className = "maptiler-marker group";
      el.innerHTML = `
        <div class="marker-pin transition-transform group-hover:scale-110">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#4CAF50" class="shadow-sm"/>
            <path d="M12 6C9.79 6 8 7.79 8 10C8 13.5 12 18 12 18C12 18 16 13.5 16 10C16 7.79 14.21 6 12 6ZM12 11.5C11.17 11.5 10.5 10.83 10.5 10C10.5 9.17 11.17 8.5 12 8.5C12.83 8.5 13.5 9.17 13.5 10C13.5 10.83 12.83 11.5 12 11.5Z" fill="#141F16"/>
          </svg>
        </div>
      `;

      const popup = new maptilersdk.Popup({
        offset: 25,
        className: "maptiler-popup-dark",
        closeButton: false,
        maxWidth: "240px",
      }).setHTML(`
        <div style="padding: 12px; background: #223326; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3); border: 1px solid #304535;">
          <p style="font-weight: 700; color: #F4F7F5; margin: 0 0 4px; font-size: 14px;">${predio.nombre}</p>
          <p style="color: #9BAA9E; margin: 0 0 12px; font-size: 12px; line-height: 1.4;">${predio.direccion}</p>
          <a href="/predio/${predio.id}" style="display: block; text-align: center; background: #4CAF50; color: #FFFFFF; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#66BB6A'" onmouseout="this.style.background='#4CAF50'">Ver disponibilidad →</a>
        </div>
      `);

      const marker = new maptilersdk.Marker({ element: el })
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
      const bounds = new maptilersdk.LngLatBounds();
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
          <p className="text-text-main font-semibold">API Key de MapTiler no configurada</p>
          <p className="text-text-muted text-sm mt-1 max-w-xs">
            Agregá{" "}
            <code className="text-brand-dark bg-surface-hover px-1 rounded">
              NEXT_PUBLIC_MAPTILER_KEY
            </code>{" "}
            en tu archivo{" "}
            <code className="text-brand-dark bg-surface-hover px-1 rounded">.env</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .maptiler-marker { cursor: pointer; }
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
        .maplibregl-popup-tip { border-top-color: #1B2F22 !important; }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  );
}
