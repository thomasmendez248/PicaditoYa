import { NextRequest, NextResponse } from "next/server";
import { verificarYEnviarRecordatorios30Min } from "@/lib/recordatorios-turnos";
import { cancelarTurnosPendientesVencidos } from "@/lib/turnos-expirados";

/**
 * GET/POST /api/cron/recordatorios
 *
 * Endpoint de mantenimiento programado:
 * 1. Envía notificaciones push de recordatorio (30 min antes) a los usuarios comunes con turnos confirmados.
 * 2. Cancela automáticamente turnos pendientes vencidos sin confirmación.
 *
 * Puede ser invocado por:
 * - Vercel Cron (envía header `Authorization: Bearer <CRON_SECRET>`)
 * - Llamada interna con `x-internal-secret` o `INTERNAL_API_SECRET`
 * - Supabase pg_cron o script programado
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const internalSecretHeader = request.headers.get("x-internal-secret");
    const cronSecret = process.env.CRON_SECRET;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    // Verificar si hay secrets configurados para proteger el endpoint
    if (cronSecret || internalSecret) {
      const isBearerCron = authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`;
      const isBearerInternal = authHeader && internalSecret && authHeader === `Bearer ${internalSecret}`;
      const isHeaderInternal = internalSecretHeader && internalSecret && internalSecretHeader === internalSecret;

      if (!isBearerCron && !isBearerInternal && !isHeaderInternal) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    // 1. Ejecutar recordatorios de 30 minutos
    const resultadoRecordatorios = await verificarYEnviarRecordatorios30Min();

    // 2. Limpiar turnos pendientes expirados
    const turnosExpiradosCancelados = await cancelarTurnosPendientesVencidos();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      recordatorios: resultadoRecordatorios,
      turnosExpiradosCancelados,
    });
  } catch (error) {
    console.error("[CRON /api/cron/recordatorios] Error:", error);
    return NextResponse.json(
      { error: "Error interno al ejecutar tareas cron" },
      { status: 500 }
    );
  }
}
