import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateTurnoEstadoSchema } from "@/lib/validations/admin";
import { sendPushToUser, formatearFechaAmigable } from "@/lib/push-service";

/**
 * PUT /api/empleado/turnos/[id]
 * Permite al empleado cambiar el estado de un turno de su predio.
 * Registra la acción en la auditoría.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const parsed = updateTurnoEstadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const { estado: nuevoEstado } = parsed.data;

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        cancha: {
          include: { predio: true },
        },
        cliente: true,
      },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }

    // Verificar que el turno pertenece al predio del empleado
    if (rol === "empleado") {
      if (turno.cancha.predioId !== session.user.predioId) {
        return NextResponse.json({ error: "No tenés permisos para este turno" }, { status: 403 });
      }
    }

    const estadoAnterior = turno.estado;

    const turnoActualizado = await prisma.turno.update({
      where: { id },
      data: { estado: nuevoEstado },
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
        turnoId: id,
        usuarioId: session.user.id,
        accion: "cambiar_estado",
        detalle: `${estadoAnterior} → ${nuevoEstado}`,
      },
    });

    // Notificar al cliente si se aprueba o rechaza una solicitud de cancelación
    if (estadoAnterior === "pendiente_cancelacion" && turno.clienteId) {
      const fechaTexto = formatearFechaAmigable(turno.fecha);
      if (nuevoEstado === "cancelado_a_tiempo") {
        sendPushToUser(turno.clienteId, {
          title: "Cancelación aprobada ✅",
          body: `Tu solicitud de cancelación para el turno en ${turno.cancha.nombre} (${fechaTexto} ${turno.horaInicio}hs) fue aceptada.`,
          url: "/cliente/mis-turnos",
          tag: `cancelacion-aprobada-${turno.id}`,
        }).catch((err) => console.error("[PUT /api/empleado/turnos/[id]] Error push cancelación aprobada:", err));
      } else if (nuevoEstado === "confirmado") {
        sendPushToUser(turno.clienteId, {
          title: "Solicitud no aprobada ℹ️",
          body: `Tu solicitud de cancelación para el turno en ${turno.cancha.nombre} (${fechaTexto} ${turno.horaInicio}hs) no fue aprobada. El turno continúa confirmado.`,
          url: "/cliente/mis-turnos",
          tag: `cancelacion-rechazada-${turno.id}`,
        }).catch((err) => console.error("[PUT /api/empleado/turnos/[id]] Error push cancelación rechazada:", err));
      }
    }

    // Si se marcó asistencia, actualizar puntaje del cliente
    if (turno.clienteId && (nuevoEstado === "completado" || nuevoEstado === "no_show")) {
      const incremento =
        nuevoEstado === "completado"
          ? { turnosAsistidos: { increment: 1 }, turnosTotales: { increment: 1 } }
          : { turnosNoShow: { increment: 1 }, turnosTotales: { increment: 1 } };

      const usuario = await prisma.usuario.update({
        where: { id: turno.clienteId },
        data: incremento,
        select: { turnosAsistidos: true, turnosNoShow: true },
      });

      const total = usuario.turnosAsistidos + usuario.turnosNoShow;
      const puntaje = total > 0 ? (usuario.turnosAsistidos / total) * 100 : 100;

      await prisma.usuario.update({
        where: { id: turno.clienteId },
        data: { puntajeAsistencia: Math.round(puntaje * 10) / 10 },
      });
    }

    return NextResponse.json({ turno: turnoActualizado });
  } catch (error) {
    console.error("[PUT /api/empleado/turnos/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar el turno" }, { status: 500 });
  }
}

/**
 * DELETE /api/empleado/turnos/[id]
 * Permite al empleado eliminar / liberar un turno de su predio asignado.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || !["empleado", "admin", "super_admin"].includes(session.user.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    const turno = await prisma.turno.findUnique({
      where: { id },
      include: {
        cancha: {
          include: { predio: true },
        },
      },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }

    const esAdminPredio = session.user.rol === "admin" && turno.cancha.predio.adminId === session.user.id;
    const esEmpleadoPredio = session.user.rol === "empleado" && turno.cancha.predioId === session.user.predioId;

    if (!isSuperAdmin && !esAdminPredio && !esEmpleadoPredio) {
      return NextResponse.json({ error: "Sin permisos sobre este turno" }, { status: 403 });
    }

    // Registrar en auditoría antes de eliminar
    await prisma.auditoriaTurno.create({
      data: {
        turnoId: id,
        usuarioId: session.user.id,
        accion: "eliminar_turno",
        detalle: `Turno eliminado por ${session.user.rol}. Cancha: ${turno.cancha.nombre}, Fecha: ${turno.fecha}, Horario: ${turno.horaInicio}-${turno.horaFin}`,
      },
    });

    await prisma.turno.delete({ where: { id } });

    return NextResponse.json({ message: "Turno eliminado y horario liberado exitosamente" });
  } catch (error) {
    console.error("[DELETE /api/empleado/turnos/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar el turno" }, { status: 500 });
  }
}
