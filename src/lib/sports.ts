export type DeporteTipo = "futbol" | "padel" | "tenis" | "basquet" | "voley";

export interface InfoDeporte {
  id: DeporteTipo;
  nombre: string;
  emoji: string;
  capacidadDefault: number;
  duracionDefault: number;
}

export const DEPORTES: InfoDeporte[] = [
  { id: "futbol", nombre: "Fútbol", emoji: "", capacidadDefault: 10, duracionDefault: 60 },
  { id: "padel", nombre: "Pádel", emoji: "", capacidadDefault: 4, duracionDefault: 90 },
  { id: "tenis", nombre: "Tenis", emoji: "", capacidadDefault: 4, duracionDefault: 60 },
  { id: "basquet", nombre: "Básquet", emoji: "", capacidadDefault: 10, duracionDefault: 60 },
  { id: "voley", nombre: "Vóley", emoji: "", capacidadDefault: 12, duracionDefault: 60 },
];

export const DEPORTES_FILTRO = [
  { id: "", label: "Todos" },
  { id: "futbol", label: "Fútbol" },
  { id: "padel", label: "Pádel" },
  { id: "tenis", label: "Tenis" },
  { id: "basquet", label: "Básquet" },
  { id: "voley", label: "Vóley" },
];

export function getDeporteInfo(deporte?: string | null): InfoDeporte {
  const match = DEPORTES.find((d) => d.id === deporte);
  return match || DEPORTES[0];
}

export function getBadgeDeporte(deporte?: string | null, capacidad: number = 10): string {
  const dep = deporte || "futbol";
  switch (dep) {
    case "padel":
      return `Pádel • ${capacidad} jug.`;
    case "tenis":
      return `Tenis • ${capacidad} jug.`;
    case "basquet":
      return `Básquet • ${capacidad} jug.`;
    case "voley":
      return `Vóley • ${capacidad} jug.`;
    case "futbol":
    default:
      if (capacidad <= 10) return "Fútbol 5";
      if (capacidad <= 14) return "Fútbol 7";
      return "Fútbol 11";
  }
}
