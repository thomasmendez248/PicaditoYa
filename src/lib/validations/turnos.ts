import { z } from "zod";

export const turnoSchema = z.object({
  canchaId: z.string().cuid("ID de cancha inválido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
});

export const cancelarTurnoSchema = z.object({
  turnoId: z.string().cuid("ID de turno inválido"),
});

export const marcarAsistenciaSchema = z.object({
  turnoId: z.string().cuid("ID de turno inválido"),
  asistio: z.boolean(),
});

export type TurnoInput = z.infer<typeof turnoSchema>;
export type CancelarTurnoInput = z.infer<typeof cancelarTurnoSchema>;
export type MarcarAsistenciaInput = z.infer<typeof marcarAsistenciaSchema>;
