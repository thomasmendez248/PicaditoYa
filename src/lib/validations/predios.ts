import { z } from "zod";

export const predioSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  telefono: z.string().optional(),
  direccion: z.string().min(5, "La dirección es requerida"),
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  politicaCancelacionHoras: z.number().min(0).max(168).default(24),
});

export const canchaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  capacidad: z.number().min(1).default(10),
  precioTurno: z.number().min(0, "El precio no puede ser negativo"),
  duracionTurnoMinutos: z.number().min(30).max(240).default(60),
  horarioApertura: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido (HH:mm)"),
  horarioCierre: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido (HH:mm)"),
  diasOperativos: z.array(z.number().min(0).max(6)).min(1, "Seleccioná al menos un día"),
  politicaCancelacionHoras: z.number().optional(),
});

export type PredioInput = z.infer<typeof predioSchema>;
export type CanchaInput = z.infer<typeof canchaSchema>;
