import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFechaHoyArgentina } from "@/lib/date-utils";
import { adminTurnoSchema } from "@/lib/validations/admin";
import { checkDisponibilidad } from "@/lib/disponibilidad";

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
          auditorias: {
            include: {
              usuario: {
                select: { id: true, nombre: true, apellido: true, email: true, rol: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ horaInicio: "asc" }, { cancha: { nombre: "asc" } }],
      }),
    ]);

    // También devolver las canchas del predio para poder crear turnos
    const canchas = await prisma.cancha.findMany({
      where: { predioId },
      select: {
        id: true,
        nombre: true,
        deporte: true,
        capacidad: true,
        precioTurno: true,
        duracionTurnoMinutos: true,
        horarioApertura: true,
        horarioCierre: true,
        diasOperativos: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({
      predio,
      fecha: fechaParam,
      turnos,
      canchas,
    });
  } catch (error) {
    console.error("[GET /api/empleado/turnos]", error);
    return NextResponse.json({ error: "Error al obtener turnos del día" }, { status: 500 });
  }
}

/**
 * POST /api/empleado/turnos
 * Permite al empleado crear un turno en una cancha de su predio asignado.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rol = session.user.rol;
  if (!["empleado", "admin", "super_admin"].includes(rol)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
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
      estado,
    } = parsed.data;

    const fechaDate = new Date(fecha);

    const cancha = await prisma.cancha.findUnique({
      where: { id: canchaId },
      include: { predio: true },
    });

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    // Verificar que la cancha pertenece al predio del empleado
    const predioId = session.user.predioId;
    if (rol === "empleado" && cancha.predioId !== predioId) {
      return NextResponse.json({ error: "No tenés permisos para esta cancha" }, { status: 403 });
    }

    // Verificar disponibilidad
    const disponible = await checkDisponibilidad(canchaId, fechaDate, horaInicio, horaFin);
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
        nombreClienteManual: nombreClienteManual || null,
        telefonoClienteManual: telefonoClienteManual || null,
        precioAlMomentoReserva: parsed.data.precioAlMomentoReserva ?? cancha.precioTurno,
        esFijo: false,
        grupoFijoId: null,
      },
      include: {
        cancha: {
          select: { id: true, nombre: true, deporte: true, capacidad: true, precioTurno: true, duracionTurnoMinutos: true },
        },
        cliente: {
          select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
        },
      },
    });

    // Registrar auditoría
    await prisma.auditoriaTurno.create({
      data: {
        turnoId: turno.id,
        usuarioId: session.user.id,
        accion: "crear",
        detalle: `Turno creado por ${rol} — ${horaInicio} a ${horaFin} en ${cancha.nombre}`,
      },
    });

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/empleado/turnos]", error);
    return NextResponse.json({ error: "Error al crear el turno" }, { status: 500 });
  }
}
