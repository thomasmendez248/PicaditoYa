import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push-service";

/**
 * Busca todos los turnos confirmados para el día de hoy que comienzan en ~30 minutos
 * y envía una notificación Web Push de recordatorio al cliente correspondiente.
 * 
 * Marca `notificacion30MinEnviada = true` para evitar duplicados.
 * 
 * @returns Cantidad de recordatorios enviados exitosamente
 */
export async function verificarYEnviarRecordatorios30Min(): Promise<{
  procesados: number;
  enviados: number;
}> {
  try {
    // 1. Obtener fecha y hora actual en zona horaria de Argentina (UTC-3)
    const ahoraArgentina = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
    );

    const anio = ahoraArgentina.getFullYear();
    const mes = String(ahoraArgentina.getMonth() + 1).padStart(2, "0");
    const dia = String(ahoraArgentina.getDate()).padStart(2, "0");
    const hoyStr = `${anio}-${mes}-${dia}`;
    const hoyDate = new Date(hoyStr);

    const minutosActuales = ahoraArgentina.getHours() * 60 + ahoraArgentina.getMinutes();

    // 2. Buscar turnos confirmados de hoy que no hayan recibido el recordatorio de 30 min
    const turnoDelegate = (prisma as any).turno;
    const turnosHoy = await turnoDelegate.findMany({
      where: {
        fecha: { equals: hoyDate },
        estado: "confirmado",
        clienteId: { not: null },
        notificacion30MinEnviada: false,
      },
      include: {
        cancha: {
          include: {
            predio: true,
          },
        },
      },
    });

    if (turnosHoy.length === 0) {
      return { procesados: 0, enviados: 0 };
    }

    let enviados = 0;
    const turnosAMarcar: string[] = [];

    for (const turno of turnosHoy) {
      if (!turno.clienteId) continue;

      const [hStr, mStr] = turno.horaInicio.split(":");
      const minutosInicio = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
      const diferenciaMinutos = minutosInicio - minutosActuales;

      // Si el turno comienza en la ventana de 0 a 35 minutos
      if (diferenciaMinutos > 0 && diferenciaMinutos <= 35) {
        turnosAMarcar.push(turno.id);

        const tiempoRestanteTexto =
          diferenciaMinutos <= 5
            ? "en unos minutos"
            : `en ~${diferenciaMinutos} minutos`;

        // Enviar notificación push
        sendPushToUser(turno.clienteId, {
          title: "¡Tu partido está por comenzar! ⚽",
          body: `Recordá que tu turno en ${turno.cancha.predio.nombre} (${turno.cancha.nombre}) empieza a las ${turno.horaInicio}hs (${tiempoRestanteTexto}).`,
          url: "/cliente/mis-turnos",
          tag: `recordatorio-30min-${turno.id}`,
        }).catch((err) =>
          console.error(`[Recordatorios] Error enviando push a turno ${turno.id}:`, err)
        );

        enviados++;
      } else if (diferenciaMinutos <= 0) {
        // El turno ya inició o pasó, lo marcamos para no volver a evaluar
        turnosAMarcar.push(turno.id);
      }
    }

    // 3. Actualizar la base de datos marcando notificacion30MinEnviada = true
    if (turnosAMarcar.length > 0) {
      await turnoDelegate.updateMany({
        where: {
          id: { in: turnosAMarcar },
        },
        data: {
          notificacion30MinEnviada: true,
        },
      });
    }

    return { procesados: turnosHoy.length, enviados };
  } catch (error) {
    console.error("[Recordatorios] Error al verificar y enviar recordatorios:", error);
    return { procesados: 0, enviados: 0 };
  }
}
