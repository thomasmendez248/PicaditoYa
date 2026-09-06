import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/push/subscribe
 *
 * Guarda o actualiza una suscripción Web Push para el usuario autenticado.
 * El endpoint es único por dispositivo/navegador — si ya existe, actualiza p256dh y auth.
 * Un usuario puede tener múltiples suscripciones (diferentes dispositivos).
 */

const subscribeSchema = z.object({
  endpoint: z.string().url("El endpoint debe ser una URL válida"),
  p256dh: z.string().min(1, "p256dh es requerido"),
  auth: z.string().min(1, "auth es requerido"),
  // oldEndpoint: opcional, usado por pushsubscriptionchange en el SW
  oldEndpoint: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validar sesión NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado. Iniciá sesión para activar notificaciones." },
        { status: 401 }
      );
    }

    // 2. Parsear y validar el body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }

    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de suscripción inválidos.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth: authKey, oldEndpoint } = parsed.data;
    const userId = session.user.id;

    // 3. Si hay oldEndpoint, eliminar la suscripción antigua (pushsubscriptionchange)
    if (oldEndpoint && oldEndpoint !== endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId,
          endpoint: oldEndpoint,
        },
      });
    }

    // 4. Upsert de la suscripción (crear si no existe, actualizar si ya existe)
    // Usamos upsert por endpoint (único por dispositivo).
    // Verificamos que el userId sea el correcto para evitar que alguien registre
    // el endpoint de otro usuario.
    const existingWithDifferentUser = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });

    if (existingWithDifferentUser && existingWithDifferentUser.userId !== userId) {
      // El endpoint pertenece a otro usuario (caso raro, posible reutilización de dispositivo).
      // Eliminamos el registro anterior y creamos uno nuevo para el usuario actual.
      await prisma.pushSubscription.delete({ where: { endpoint } });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh,
        auth: authKey,
      },
      update: {
        userId, // Por si cambió (dispositivo compartido)
        p256dh,
        auth: authKey,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[API push/subscribe] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
