import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/push/unsubscribe
 *
 * Elimina la suscripción Web Push del usuario autenticado.
 * Solo puede eliminar suscripciones propias.
 */

const unsubscribeSchema = z.object({
  endpoint: z.string().url("El endpoint debe ser una URL válida"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validar sesión NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado." },
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

    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Endpoint inválido." },
        { status: 400 }
      );
    }

    const { endpoint } = parsed.data;
    const userId = session.user.id;

    // 3. Eliminar SOLO la suscripción que pertenece a este usuario
    // (evitar que un usuario elimine suscripciones de otro)
    const result = await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId, // Constraint de seguridad crítico
      },
    });

    if (result.count === 0) {
      // No es un error crítico — la suscripción puede no existir o pertenecer a otro usuario
      return NextResponse.json(
        { success: true, message: "La suscripción no existía en la base de datos." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[API push/unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
