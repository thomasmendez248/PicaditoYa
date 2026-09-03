import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { adminTurnoSchema } from "@/lib/validations/admin";
import { checkDisponibilidad } from "@/lib/disponibilidad";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const canchaId = searchParams.get("canchaId");
  const fecha = searchParams.get("fecha");

  if (!canchaId || !fecha) {
    return NextResponse.json(
      { error: "canchaId y fecha (YYYY-MM-DD) son requeridos" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);
  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    // Validar acceso a la cancha
    const cancha = await prisma.cancha.findUnique({
      where: { id: canchaId },
      include: { predio: true },
    });

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (!isSuperAdmin && cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos para esta cancha" }, { status: 403 });
    }

    const turnos = await prisma.turno.findMany({
      where: {
        canchaId,
        fecha: {
          equals: fechaDate,
        },
        estado: {
          notIn: ["cancelado_a_tiempo", "cancelado_tarde"],
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
      orderBy: { horaInicio: "asc" },
    });

    return NextResponse.json({ turnos, cancha });
  } catch (error) {
    console.error("[GET /api/admin/turnos]", error);
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
    const parsed = adminTurnoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      canchaId,
      fecha,
      horaInicio,
      horaFin,
      nombreClienteManual,
      telefonoClienteManual,
      clienteId,
      estado,
    } = parsed.data;

    const fechaDate = new Date(fecha);

    const isSuperAdmin = session.user.rol === "super_admin";
    
    // Consultar cancha y disponibilidad en paralelo para eliminar cascada
    const [cancha, disponible] = await Promise.all([
      prisma.cancha.findUnique({
        where: { id: canchaId },
        include: { predio: true },
      }),
      checkDisponibilidad(canchaId, fechaDate, horaInicio, horaFin),
    ]);

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (!isSuperAdmin && cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos para esta cancha" }, { status: 403 });
    }

    if (!disponible) {
      return NextResponse.json(
        { error: "El horario seleccionado ya se encuentra ocupado por otro turno" },
        { status: 409 }
      );
    }

    const turno = await prisma.turno.create({
      data: {
        canchaId,
        fecha: fechaDate,
        horaInicio,
        horaFin,
        estado: estado ?? "confirmado",
        clienteId: clienteId || null,
        nombreClienteManual: nombreClienteManual || null,
        telefonoClienteManual: telefonoClienteManual || null,
        precioAlMomentoReserva: parsed.data.precioAlMomentoReserva ?? cancha.precioTurno,
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, email: true, telefono: true },
        },
      },
    });

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/turnos]", error);
    return NextResponse.json({ error: "Error al crear el turno" }, { status: 500 });
  }
}
