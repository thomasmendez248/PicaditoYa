import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { turnoSchema } from "@/lib/validations/turnos";
import { sendPushToUser, formatearFechaAmigable } from "@/lib/push-service";

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
    const turno = await prisma.$transaction(async (tx) => {
      // 1. Bloqueo de fila para serializar reservas simultáneas en la misma cancha
      await tx.$executeRaw`SELECT id FROM canchas WHERE id = ${canchaId} FOR UPDATE`;

      const cancha = await tx.cancha.findUnique({
        where: { id: canchaId },
        include: {
          predio: {
            include: { admin: { select: { fechaVencimientoSuscripcion: true, activo: true } } },
          },
        },
      });

      if (!cancha) {
        throw new Error("CANCHA_NO_ENCONTRADA");
      }

      const hoy = new Date();
      const adminVencido = cancha.predio.admin?.fechaVencimientoSuscripcion
        ? new Date(cancha.predio.admin.fechaVencimientoSuscripcion) < hoy
        : true;

      if (cancha.predio.estado !== "activo" || adminVencido || cancha.predio.admin?.activo === false) {
        throw new Error("PREDIO_NO_DISPONIBLE");
      }

      // 2. Verificar disponibilidad dentro de la transacción protegida
      const turnosOcupados = await tx.turno.findMany({
        where: {
          canchaId,
          fecha: { equals: fechaDate },
          estado: { in: ["confirmado", "pendiente"] },
        },
        select: {
          id: true,
          horaInicio: true,
          horaFin: true,
        },
      });

      const [hIni, mIni] = horaInicio.split(":").map(Number);
      const [hFin, mFin] = horaFin.split(":").map(Number);
      const reqInicio = hIni * 60 + mIni;
      let reqFin = hFin * 60 + mFin;
      if (reqFin <= reqInicio) reqFin += 24 * 60;

      const haySolapamiento = turnosOcupados.some((t) => {
        const [tHIni, tMIni] = t.horaInicio.split(":").map(Number);
        const [tHFin, tMFin] = t.horaFin.split(":").map(Number);
        const tInicio = tHIni * 60 + tMIni;
        let tFin = tHFin * 60 + tMFin;
        if (tFin <= tInicio) tFin += 24 * 60;
        return reqInicio < tFin && reqFin > tInicio;
      });

      if (haySolapamiento) {
        throw new Error("TURNO_SOLAPADO");
      }

      // 3. Calcular precio proporcional a la duración en minutos
      const duracionMin = reqFin - reqInicio;
      const precioProporcional = duracionMin > 0
        ? Math.round((cancha.precioTurno * duracionMin) / 60)
        : cancha.precioTurno;

      // 4. Crear el turno atómicamente
      return tx.turno.create({
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
    });

    // Notificar al administrador del predio sobre la nueva solicitud de turno
    const adminId = turno.cancha.predio.adminId;
    if (adminId) {
      const fechaTexto = formatearFechaAmigable(fechaDate);
      const nombreSolicitante = turno.nombreClienteManual || session?.user?.name || "Un cliente";
      sendPushToUser(adminId, {
        title: "Nueva solicitud de turno 📋",
        body: `${nombreSolicitante} solicitó un turno en ${turno.cancha.nombre} para el ${fechaTexto} a las ${horaInicio}hs.`,
        url: "/admin",
        tag: `solicitud-turno-${turno.id}`,
      }).catch((err) => console.error("[POST /api/turnos] Error al enviar push al admin:", err));
    }

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CANCHA_NO_ENCONTRADA") {
        return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
      }
      if (error.message === "PREDIO_NO_DISPONIBLE") {
        return NextResponse.json(
          { error: "El predio no está disponible para reservas actualmente" },
          { status: 403 }
        );
      }
      if (error.message === "TURNO_SOLAPADO") {
        return NextResponse.json(
          { error: "La cancha ya tiene un turno reservado en ese horario" },
          { status: 409 }
        );
      }
    }
    console.error("[POST /api/turnos]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
