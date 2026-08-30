import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkDisponibilidad } from "@/lib/disponibilidad";
import { turnoSchema } from "@/lib/validations/turnos";

/**
 * POST /api/turnos
 * Crea un nuevo turno. Requiere sesión activa (cualquier rol cliente).
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Debés iniciar sesión para reservar un turno" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = turnoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { canchaId, fecha, horaInicio, horaFin } = parsed.data;
  const fechaDate = new Date(fecha);

  try {
    // Verificar que la cancha existe y su predio está activo
    const cancha = await prisma.cancha.findUnique({
      where: { id: canchaId },
      include: { predio: true },
    });

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (cancha.predio.estado !== "activo") {
      return NextResponse.json(
        { error: "El predio no está disponible para reservas" },
        { status: 403 }
      );
    }

    // Verificar disponibilidad (sin superposición)
    const disponible = await checkDisponibilidad(canchaId, fechaDate, horaInicio, horaFin);

    if (!disponible) {
      return NextResponse.json(
        { error: "La cancha ya tiene un turno en ese horario" },
        { status: 409 }
      );
    }

    // Crear el turno
    const turno = await prisma.turno.create({
      data: {
        canchaId,
        clienteId: session.user.id,
        fecha: fechaDate,
        horaInicio,
        horaFin,
        estado: "confirmado",
        precioAlMomentoReserva: cancha.precioTurno,
      },
    });

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/turnos]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
