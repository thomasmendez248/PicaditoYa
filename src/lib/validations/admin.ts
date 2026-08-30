import { z } from "zod";

export const canchaSchema = z.object({
  predioId: z.string().cuid("ID de predio inválido"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  capacidad: z.number().int().min(2, "Capacidad mínima 2 jugadores").default(10),
  precioTurno: z.number().min(0, "El precio no puede ser negativo"),
  duracionTurnoMinutos: z.number().int().min(15, "Mínimo 15 minutos").default(60),
  horarioApertura: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm inválido"),
  horarioCierre: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm inválido"),
  diasOperativos: z.array(z.number().min(0).max(6)).min(1, "Debe seleccionar al menos un día"),
  politicaCancelacionHoras: z.number().int().min(0).optional().nullable(),
});

export const updateCanchaSchema = canchaSchema.omit({ predioId: true }).partial();

export const adminTurnoSchema = z.object({
  canchaId: z.string().cuid("ID de cancha inválido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm inválido"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm inválido"),
  nombreClienteManual: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres").optional(),
  telefonoClienteManual: z.string().optional(),
  clienteId: z.string().cuid().optional().nullable(),
  estado: z.enum(["pendiente", "confirmado"]).default("confirmado"),
  precioAlMomentoReserva: z.number().optional(),
});

export const updateTurnoEstadoSchema = z.object({
  estado: z.enum(["pendiente", "confirmado", "cancelado_a_tiempo", "cancelado_tarde", "completado", "no_show"]),
});

export const nuevoPredioSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  telefono: z.string().optional(),
  direccion: z.string().min(5, "Dirección requerida"),
  latitud: z.number(),
  longitud: z.number(),
  politicaCancelacionHoras: z.number().int().min(0).default(24),
});

export const updatePredioSchema = nuevoPredioSchema.partial();

export type CanchaInput = z.infer<typeof canchaSchema>;
export type AdminTurnoInput = z.infer<typeof adminTurnoSchema>;
export type NuevoPredioInput = z.infer<typeof nuevoPredioSchema>;
export type UpdatePredioInput = z.infer<typeof updatePredioSchema>;
