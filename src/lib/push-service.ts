import { prisma } from "@/lib/prisma";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

/**
 * Formatea una fecha (YYYY-MM-DD o Date) en texto amigable en español.
 * Ej: "Miércoles 10 de Septiembre"
 */
export function formatearFechaAmigable(fecha: Date | string): string {
  try {
    let dateObj: Date;
    if (typeof fecha === "string") {
      const [year, month, day] = fecha.split("T")[0].split("-").map(Number);
      dateObj = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      dateObj = new Date(fecha);
    }

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "America/Argentina/Buenos_Aires",
    };

    const formateada = dateObj.toLocaleDateString("es-AR", opciones);
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  } catch {
    return typeof fecha === "string" ? fecha.split("T")[0] : fecha.toISOString().split("T")[0];
  }
}

/**
 * Envía una notificación Web Push a todos los dispositivos registrados de un usuario.
 * Invoca la Supabase Edge Function `send-push-notification` con autenticación service_role.
 * Limpia automáticamente las suscripciones expiradas o inválidas reportadas por los navegadores.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    if (!userId) {
      return { success: false, sent: 0, failed: 0 };
    }

    // 1. Obtener suscripciones activas del usuario
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // 2. Credenciales de Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn("[PushService] Variables de Supabase no configuradas para Push.");
      return { success: false, sent: 0, failed: 0 };
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

    const response = await fetch(edgeFunctionUrl, {
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
        notification: {
          title: payload.title,
          body: payload.body,
          url: payload.url || "/",
          icon: payload.icon || "/favicon.ico",
          badge: payload.badge || "/favicon.ico",
          tag: payload.tag,
          requireInteraction: payload.requireInteraction,
          data: payload.data,
        },
        userId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[PushService] Error Edge Function (${response.status}):`, errText);
      return { success: false, sent: 0, failed: subscriptions.length };
    }

    const result = await response.json();

    // 3. Limpieza de endpoints inválidos/desuscritos
    if (result.invalidEndpoints && Array.isArray(result.invalidEndpoints) && result.invalidEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint: { in: result.invalidEndpoints },
          userId,
        },
      });
      console.log(`[PushService] Se eliminaron ${result.invalidEndpoints.length} suscripciones inválidas.`);
    }

    return {
      success: true,
      sent: result.sent ?? subscriptions.length,
      failed: result.failed ?? 0,
    };
  } catch (error) {
    console.error("[PushService] Error inesperado al enviar push:", error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Envía una notificación Web Push a múltiples usuarios en paralelo.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<void> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  await Promise.allSettled(uniqueIds.map((id) => sendPushToUser(id, payload)));
}
