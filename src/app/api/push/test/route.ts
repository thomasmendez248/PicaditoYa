import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push-service";

/**
 * POST /api/push/test
 *
 * Envía una notificación Push de prueba al usuario autenticado.
 * Requiere que el usuario esté autenticado y tenga al menos una suscripción activa.
 *
 * Esta ruta es accesible para cualquier usuario autenticado (admin, cliente, empleado).
 */

export async function POST(request: NextRequest) {
  void request;

  try {
    // 1. Validar sesión NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado. Iniciá sesión para enviar una notificación de prueba." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Verificar que el usuario tenga suscripciones Push activas
    const subsCount = await prisma.pushSubscription.count({
      where: { userId },
    });

    if (subsCount === 0) {
      return NextResponse.json(
        {
          error:
            "No tenés ningún dispositivo suscripto a las notificaciones. Activá las notificaciones primero.",
        },
        { status: 400 }
      );
    }

    // 3. Enviar mediante el servicio centralizado
    const result = await sendPushToUser(userId, {
      title: "🎯 Notificación de prueba",
      body: "Las notificaciones están funcionando correctamente. ¡Todo listo!",
      url: "/",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: false,
      data: {
        type: "test",
        sentAt: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "Error al enviar la notificación de prueba. Verificá que la Edge Function esté desplegada y los secrets configurados.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      message: "Notificación de prueba enviada correctamente.",
    });
  } catch (err) {
    console.error("[API push/test] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
