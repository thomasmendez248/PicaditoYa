import { prisma } from "@/lib/prisma";
import { getFechaHoyArgentina, getHoraActualArgentina } from "@/lib/date-utils";

/**
 * Cancela automáticamente todos los turnos con estado "pendiente"
 * cuya fecha u horario de inicio ya hayan transcurrido sin confirmación.
 * Pasan a estado "cancelado_tarde" con canceladoEn = fecha actual.
 *
 * @param canchaIds Opcional: lista de IDs de canchas a filtrar. Si no se especifica, aplica a todas.
 */
export async function cancelarTurnosPendientesVencidos(canchaIds?: string[]): Promise<number> {
  try {
    // Obtener fecha y hora exacta en zona horaria de Argentina (UTC-3)
    const hoyStr = getFechaHoyArgentina();
    const hoyDate = new Date(hoyStr);
    const horaActual = getHoraActualArgentina();

    const whereBase: Record<string, unknown> = {
      estado: "pendiente",
    };

    if (canchaIds && canchaIds.length > 0) {
      whereBase.canchaId = { in: canchaIds };
    }

    const ahora = new Date();

    // 1. Turnos pendientes de fechas anteriores a hoy
    const p1 = prisma.turno.updateMany({
      where: {
        ...whereBase,
        fecha: { lt: hoyDate },
      },
      data: {
        estado: "cancelado_tarde",
        canceladoEn: ahora,
      },
    });

    // 2. Turnos pendientes de hoy cuyo horario de inicio ya pasó
    const p2 = prisma.turno.updateMany({
      where: {
        ...whereBase,
        fecha: { equals: hoyDate },
        horaInicio: { lte: horaActual },
      },
      data: {
        estado: "cancelado_tarde",
        canceladoEn: ahora,
      },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    return r1.count + r2.count;
  } catch (error) {
    console.error("[cancelarTurnosPendientesVencidos] Error al cancelar turnos vencidos:", error);
    return 0;
  }
}
