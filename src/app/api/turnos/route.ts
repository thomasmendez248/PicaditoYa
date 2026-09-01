import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkDisponibilidad } from "@/lib/disponibilidad";
import { turnoSchema } from "@/lib/validations/turnos";

/**
 * GET /api/turnos?canchaId=...&fecha=YYYY-MM-DD
 * Devuelve los turnos ocupados de una cancha en una fecha dada.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const canchaId = searchParams.get("canchaId");
  const fecha = searchParams.get("fecha");

  if (!canchaId || !fecha) {
    return NextResponse.json({ error: "Se requieren canchaId y fecha" }, { status: 400 });
  }

  const fechaDate = new Date(fecha);

  try {
    const turnos = await prisma.turno.findMany({
      where: {
        canchaId,
        fecha: { equals: fechaDate },
        estado: { in: ["confirmado", "pendiente"] as any },
      },
      select: {
        id: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
      },
      orderBy: { horaInicio: "asc" },
    });

    return NextResponse.json({ turnos });
  } catch (error) {
    console.error("[GET /api/turnos]", error);
    return NextResponse.json({ error: "Error al obtener turnos" }, { status: 500 });
  }
}

/**
 * POST /api/turnos
 * Crea un nuevo turno. Permite reservas públicas con nombre de cliente (sin requerir login).
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  const body = await request.json();
  const parsed = turnoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { canchaId, fecha, horaInicio, horaFin, nombreCliente, telefonoCliente } = parsed.data;
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
        { error: "La cancha ya tiene un turno reservado en ese horario" },
        { status: 409 }
      );
    }

    // Calcular precio proporcional a la duración en minutos
    const [hIni, mIni] = horaInicio.split(":").map(Number);
    const [hFin, mFin] = horaFin.split(":").map(Number);
    const inicioMin = hIni * 60 + mIni;
    let finMin = hFin * 60 + mFin;
    if (finMin < inicioMin) finMin += 24 * 60;
    const duracionMin = finMin - inicioMin;
    const precioProporcional = duracionMin > 0
      ? Math.round((cancha.precioTurno * duracionMin) / 60)
      : cancha.precioTurno;

    // Crear el turno (con clienteId si hay sesión o nombre manual)
    const turno = await prisma.turno.create({
      data: {
        canchaId,
        clienteId: session?.user?.id || null,
        nombreClienteManual: nombreCliente || (session?.user?.name ?? "Jugador"),
        telefonoClienteManual: telefonoCliente || null,
        fecha: fechaDate,
        horaInicio,
        horaFin,
        estado: "pendiente",
        precioAlMomentoReserva: precioProporcional,
      },
      include: {
        cancha: {
          include: {
            predio: true,
          },
        },
      },
    });

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/turnos]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
