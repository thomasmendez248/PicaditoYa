"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type PredioAdmin = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string | null;
  latitud: number;
  longitud: number;
  estado: string;
  politicaCancelacionHoras?: number;
  _count?: {
    canchas: number;
  };
};

type AdminContextType = {
  predios: PredioAdmin[];
  selectedPredioId: string | null;
  selectedPredio: PredioAdmin | null;
  setSelectedPredioId: (id: string) => void;
  maxPredios: number;
  puedeCrearMas: boolean;
  cargando: boolean;
  refetchPredios: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [predios, setPredios] = useState<PredioAdmin[]>([]);
  const [selectedPredioId, setSelectedPredioId] = useState<string | null>(null);
  const [maxPredios, setMaxPredios] = useState(1);
  const [puedeCrearMas, setPuedeCrearMas] = useState(false);
  const [cargando, setCargando] = useState(true);

  const fetchPredios = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/admin/predios");
      if (!res.ok) throw new Error("Error al cargar predios");
      const data = await res.json();
      setPredios(data.predios || []);
      setMaxPredios(data.maxPredios || 1);
      setPuedeCrearMas(data.puedeCrearMas || false);

      // Si no hay predio seleccionado o el seleccionado ya no existe, seleccionar el primero
      if (data.predios && data.predios.length > 0) {
        setSelectedPredioId((prev) => {
          const exists = data.predios.some((p: PredioAdmin) => p.id === prev);
          return exists ? prev : data.predios[0].id;
        });
      } else {
        setSelectedPredioId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchPredios();
  }, [fetchPredios]);

  const selectedPredio = predios.find((p) => p.id === selectedPredioId) || null;

  return (
    <AdminContext.Provider
      value={{
        predios,
        selectedPredioId,
        selectedPredio,
        setSelectedPredioId,
        maxPredios,
        puedeCrearMas,
        cargando,
        refetchPredios: fetchPredios,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin debe usarse dentro de un AdminProvider");
  }
  return context;
}
