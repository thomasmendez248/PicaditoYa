import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/push/test
 *
 * Envía una notificación Push de prueba al usuario autenticado.
 * Requiere que el usuario esté autenticado y tenga al menos una suscripción activa.
 *
 * Esta ruta es accesible para cualquier usuario autenticado (admin, cliente, empleado).
 */

export async function POST(request: NextRequest) {
  // Evitar advertencias de "request not used"
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
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No tenés ningún dispositivo suscripto a las notificaciones. Activá las notificaciones primero.",
        },
        { status: 400 }
      );
    }

    // 3. Verificar configuración de Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[API push/test] Faltan variables de entorno de Supabase");
      return NextResponse.json(
        { error: "El servidor no está configurado para enviar notificaciones. Contactá al soporte." },
        { status: 503 }
      );
    }

    // 4. Invocar la Edge Function para enviar la notificación de prueba
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

    const notificationPayload = {
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
    };

    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        subscriptions: subscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        })),
        notification: notificationPayload,
        userId,
      }),
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text().catch(() => "");
      console.error("[API push/test] Error de Edge Function:", edgeResponse.status, errorText);
      return NextResponse.json(
        {
          error:
            "Error al enviar la notificación de prueba. Verificá que la Edge Function esté desplegada y los secrets configurados.",
        },
        { status: 502 }
      );
    }

    const result = await edgeResponse.json();

    // 5. Limpiar suscripciones inválidas (si las hay)
    if (result.invalidEndpoints && Array.isArray(result.invalidEndpoints) && result.invalidEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint: { in: result.invalidEndpoints },
          userId,
        },
      });
      console.log(`[API push/test] Eliminadas ${result.invalidEndpoints.length} suscripciones inválidas`);
    }

    return NextResponse.json({
      success: true,
      sent: result.sent ?? subscriptions.length,
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
