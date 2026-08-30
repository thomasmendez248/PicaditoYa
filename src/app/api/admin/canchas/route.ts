import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canchaSchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const predioId = searchParams.get("predioId");

  if (!predioId) {
    return NextResponse.json({ error: "predioId es requerido" }, { status: 400 });
  }

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    // Validar propiedad del predio
    const predio = await prisma.predio.findFirst({
      where: isSuperAdmin ? { id: predioId } : { id: predioId, adminId: session.user.id },
    });

    if (!predio) {
      return NextResponse.json({ error: "Predio no encontrado o sin permisos" }, { status: 404 });
    }

    const canchas = await prisma.cancha.findMany({
      where: { predioId },
      include: {
        _count: {
          select: {
            turnos: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ canchas, predio });
  } catch (error) {
    console.error("[GET /api/admin/canchas]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = canchaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const isSuperAdmin = session.user.rol === "super_admin";

    // Verificar que el admin es dueño del predio
    const predio = await prisma.predio.findFirst({
      where: isSuperAdmin
        ? { id: parsed.data.predioId }
        : { id: parsed.data.predioId, adminId: session.user.id },
    });

    if (!predio) {
      return NextResponse.json({ error: "Predio no encontrado o sin permisos" }, { status: 403 });
    }

    const cancha = await prisma.cancha.create({
      data: parsed.data,
    });

    return NextResponse.json({ cancha }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/canchas]", error);
    return NextResponse.json({ error: "Error al crear la cancha" }, { status: 500 });
  }
}
