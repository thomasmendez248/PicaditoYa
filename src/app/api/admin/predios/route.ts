import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nuevoPredioSchema } from "@/lib/validations/admin";

export async function GET() {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { maxPredios: true, rol: true },
    });

    const isSuperAdmin = usuario?.rol === "super_admin";

    const predios = await prisma.predio.findMany({
      where: isSuperAdmin ? {} : { adminId: session.user.id },
      include: {
        _count: {
          select: {
            canchas: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const maxPredios = isSuperAdmin ? 999 : (usuario?.maxPredios ?? 1);
    const puedeCrearMas = predios.length < maxPredios;

    return NextResponse.json({
      predios,
      maxPredios,
      totalPredios: predios.length,
      puedeCrearMas,
    });
  } catch (error) {
    console.error("[GET /api/admin/predios]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { maxPredios: true, rol: true },
  });

  const isSuperAdmin = usuario?.rol === "super_admin";
  const maxPredios = isSuperAdmin ? 999 : (usuario?.maxPredios ?? 1);

  const totalActual = await prisma.predio.count({
    where: { adminId: session.user.id },
  });

  if (!isSuperAdmin && totalActual >= maxPredios) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de predios permitidos (${maxPredios}) para tu plan actual. Contactá a soporte para ampliar tu plan.`,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = nuevoPredioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const predio = await prisma.predio.create({
      data: {
        ...parsed.data,
        adminId: session.user.id,
        estado: "activo",
      },
    });

    return NextResponse.json({ predio }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/predios]", error);
    return NextResponse.json({ error: "Error al crear el predio" }, { status: 500 });
  }
}
