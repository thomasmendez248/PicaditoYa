import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFechaHoyArgentina } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rol = session.user.rol;
  if (!["empleado", "admin", "super_admin"].includes(rol)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fechaParam = searchParams.get("fecha") || getFechaHoyArgentina();

  // Determinar predioId
  let predioId = session.user.predioId;

  // Si es admin o super_admin, permitir especificar predioId por query o fallback a su predio
  if ((rol === "admin" || rol === "super_admin") && !predioId) {
    const queryPredioId = searchParams.get("predioId");
    if (queryPredioId) {
      predioId = queryPredioId;
    } else {
      const primerPredio = await prisma.predio.findFirst({
        where: rol === "admin" ? { adminId: session.user.id } : undefined,
        select: { id: true },
      });
      predioId = primerPredio?.id ?? null;
    }
  }

  if (!predioId) {
    return NextResponse.json({ error: "No se encontró predio asignado para este usuario" }, { status: 400 });
  }

  try {
    const fechaDate = new Date(fechaParam);

    const [predio, turnos] = await Promise.all([
      prisma.predio.findUnique({
        where: { id: predioId },
        select: { id: true, nombre: true, direccion: true },
      }),
      prisma.turno.findMany({
        where: {
          cancha: { predioId },
          fecha: { equals: fechaDate },
        },
        include: {
          cancha: {
            select: {
              id: true,
              nombre: true,
              deporte: true,
              capacidad: true,
              precioTurno: true,
              duracionTurnoMinutos: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              telefono: true,
              image: true,
              puntajeAsistencia: true,
              turnosAsistidos: true,
              turnosNoShow: true,
            },
          },
        },
        orderBy: [{ horaInicio: "asc" }, { cancha: { nombre: "asc" } }],
      }),
    ]);

    return NextResponse.json({
      predio,
      fecha: fechaParam,
      turnos,
    });
  } catch (error) {
    console.error("[GET /api/empleado/turnos]", error);
    return NextResponse.json({ error: "Error al obtener turnos del día" }, { status: 500 });
  }
}
