import { z } from "zod";

export const turnoSchema = z.object({
  canchaId: z.string().min(1, "ID de cancha requerido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
  nombreCliente: z.string().min(2, "Ingresá tu nombre").optional().or(z.literal("")),
  telefonoCliente: z.string().optional().or(z.literal("")),
});

export const cancelarTurnoSchema = z.object({
  turnoId: z.string().min(1, "ID de turno inválido"),
});

export const marcarAsistenciaSchema = z.object({
  turnoId: z.string().min(1, "ID de turno inválido"),
  asistio: z.boolean(),
});

export type TurnoInput = z.infer<typeof turnoSchema>;
export type CancelarTurnoInput = z.infer<typeof cancelarTurnoSchema>;
export type MarcarAsistenciaInput = z.infer<typeof marcarAsistenciaSchema>;
