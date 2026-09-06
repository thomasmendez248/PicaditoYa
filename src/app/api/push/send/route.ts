import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/push/send
 *
 * API interna para enviar notificaciones Push a un usuario.
 * SOLO puede ser llamada desde el backend de Next.js (Server Actions, cron jobs, etc.)
 * o por super_admin.
 *
 * El user_id destinatario viene en el body — el sistema decide a quién enviar.
 * La seguridad se garantiza por:
 *   1. Solo super_admin puede llamar a este endpoint desde el frontend.
 *   2. Para uso interno (servidor), se usa directamente sendPushToUser() de la lib.
 */

const sendSchema = z.object({
  userId: z.string().min(1, "userId es requerido"),
  title: z.string().min(1, "title es requerido").max(100),
  body: z.string().min(1, "body es requerido").max(300),
  url: z.string().default("/"),
  icon: z.string().optional(),
  badge: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validar sesión — solo super_admin puede usar este endpoint desde el cliente
    const session = await auth();

    // Verificar si viene de una llamada interna (header especial) o de super_admin
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternalCall =
      internalSecret &&
      internalSecret === process.env.INTERNAL_API_SECRET;
    const isSuperAdmin = session?.user?.rol === "super_admin";

    if (!isInternalCall && !isSuperAdmin) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 403 }
      );
    }

    // 2. Parsear y validar el body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }

    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de notificación inválidos.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, ...notificationPayload } = parsed.data;

    // 3. Obtener suscripciones del usuario destinatario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { success: true, sent: 0, message: "El usuario no tiene suscripciones Push." },
        { status: 200 }
      );
    }

    // 4. Invocar la Supabase Edge Function para enviar las notificaciones
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[API push/send] Faltan variables de entorno de Supabase");
      return NextResponse.json(
        { error: "Configuración del servidor incompleta." },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

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
        userId, // Para logging en la Edge Function
      }),
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text().catch(() => "");
      console.error("[API push/send] Error de Edge Function:", edgeResponse.status, errorText);
      return NextResponse.json(
        { error: "Error al enviar las notificaciones." },
        { status: 502 }
      );
    }

    const result = await edgeResponse.json();

    // 5. Limpiar suscripciones inválidas reportadas por la Edge Function
    if (result.invalidEndpoints && Array.isArray(result.invalidEndpoints)) {
      const invalidCount = result.invalidEndpoints.length;
      if (invalidCount > 0) {
        await prisma.pushSubscription.deleteMany({
          where: {
            endpoint: { in: result.invalidEndpoints },
            userId,
          },
        });
        console.log(`[API push/send] Eliminadas ${invalidCount} suscripciones inválidas del usuario ${userId}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: result.sent ?? subscriptions.length,
      failed: result.failed ?? 0,
      invalidEndpoints: result.invalidEndpoints ?? [],
    });
  } catch (err) {
    console.error("[API push/send] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
