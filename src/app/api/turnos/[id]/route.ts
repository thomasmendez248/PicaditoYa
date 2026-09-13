import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cancelarTurnoSchema, marcarAsistenciaSchema } from "@/lib/validations/turnos";
import { differenceInHours } from "date-fns";
import { sendPushToUser, formatearFechaAmigable } from "@/lib/push-service";
import { parseArgentinaDateTime } from "@/lib/date-utils";

/**
 * PATCH /api/turnos/[id]
 * Acciones: cancelar (cliente) o marcar asistencia (empleado/admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  try {
    const turno = await prisma.turno.findUnique({
      where: { id },
      include: { cancha: { include: { predio: true } } },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }

    // ─── CANCELAR TURNO ───────────────────────────────────────────────
    if (action === "cancelar") {
      // Solo el cliente dueño del turno puede cancelarlo
      if (turno.clienteId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      // Si ya solicitó cancelación y está pendiente de revisión por el predio
      if (turno.estado === "pendiente_cancelacion") {
        return NextResponse.json(
          { error: "La cancelación de este turno ya fue solicitada y se encuentra pendiente de revisión" },
          { status: 400 }
        );
      }

      if (turno.estado !== "confirmado" && turno.estado !== "pendiente") {
        return NextResponse.json(
          { error: "Solo se pueden cancelar turnos activos o pendientes" },
          { status: 400 }
        );
      }

      // Verificar si la fecha y horario del turno ya pasaron (respetando zona horaria de Argentina)
      const ahora = new Date();
      const fechaTurno = parseArgentinaDateTime(turno.fecha, turno.horaInicio);
      if (fechaTurno <= ahora) {
        return NextResponse.json(
          { error: "No se puede cancelar un turno cuya fecha y horario ya han pasado" },
          { status: 400 }
        );
      }

      // Calcular horas de anticipación
      const horasAnticipacion = differenceInHours(fechaTurno, ahora);

      // La política de cancelación: usa override de cancha si existe, sino la del predio (default 24)
      const politicaHoras =
        turno.cancha.politicaCancelacionHoras ??
        turno.cancha.predio.politicaCancelacionHoras ??
        24;

      // Verificar si se puede por la cantidad de horas disponible de la cancelación
      if (horasAnticipacion < politicaHoras) {
        return NextResponse.json(
          {
            error: `No es posible cancelar el turno: la política del complejo exige un mínimo de ${politicaHoras} horas de anticipación (quedan ${Math.max(0, horasAnticipacion)} hs).`,
            horasAnticipacion,
            politicaHoras,
          },
          { status: 400 }
        );
      }

      // Al cancelarlo por el cliente este no se elimina, pasa a estado pendiente a cancelación
      const turnoActualizado = await prisma.turno.update({
        where: { id },
        data: {
          estado: "pendiente_cancelacion",
          canceladoEn: ahora,
        },
      });

      await prisma.auditoriaTurno.create({
        data: {
          turnoId: id,
          usuarioId: session.user.id,
          accion: "solicitar_cancelacion",
          detalle: `Cliente solicitó cancelación con ${horasAnticipacion}hs de anticipación (política requerida: ${politicaHoras}hs)`,
        },
      });

      // Notificar al administrador del predio sobre la solicitud de cancelación
      const adminId = turno.cancha.predio.adminId;
      if (adminId) {
        const fechaTexto = formatearFechaAmigable(turno.fecha);
        const nombreCliente = session.user.name || turno.nombreClienteManual || "Un cliente";
        sendPushToUser(adminId, {
          title: "Solicitud de cancelación ⚠️",
          body: `${nombreCliente} solicitó cancelar su turno en ${turno.cancha.nombre} para el ${fechaTexto} a las ${turno.horaInicio}hs (${horasAnticipacion}hs de anticipación).`,
          url: "/admin/turnos",
          tag: `solicitud-cancelacion-${turno.id}`,
        }).catch((err) => console.error("[PATCH /api/turnos/[id]] Error al enviar push de cancelación al admin:", err));
      }

      return NextResponse.json({
        turno: turnoActualizado,
        mensaje: "Solicitud de cancelación enviada correctamente. El administrador o empleado revisará y confirmará la cancelación.",
      });
    }

    // ─── MARCAR ASISTENCIA ────────────────────────────────────────────
    if (action === "marcar_asistencia") {
      // Solo empleados asignados, el admin dueño del predio o super_admin
      const rolOk = ["empleado", "admin", "super_admin"].includes(session.user.rol);
      const predioOk =
        session.user.rol === "super_admin" ||
        session.user.predioId === turno.cancha.predioId ||
        turno.cancha.predio.adminId === session.user.id;

      if (!rolOk || !predioOk) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const parsed = marcarAsistenciaSchema.safeParse({ turnoId: id, ...body });
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
      }

      const { asistio } = parsed.data;
      const nuevoEstado = asistio ? "completado" : "no_show";

      const turnoActualizado = await prisma.turno.update({
        where: { id },
        data: { estado: nuevoEstado },
      });

      await prisma.auditoriaTurno.create({
        data: {
          turnoId: id,
          usuarioId: session.user.id,
          accion: "marcar_asistencia",
          detalle: `${turno.estado} → ${nuevoEstado} (${asistio ? "Asistió" : "No asistió"})`,
        },
      });

      if (turno.clienteId) {
        await actualizarPuntajeCliente(turno.clienteId, asistio ? "completado" : "no_show");
      }

      return NextResponse.json({ turno: turnoActualizado });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/turnos/[id]]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * Actualiza el puntaje de asistencia del cliente después de una acción.
 * puntajeAsistencia = turnosAsistidos / (turnosAsistidos + turnosNoShow) * 100
 */
async function actualizarPuntajeCliente(
  clienteId: string,
  resultado: "completado" | "no_show"
) {
  const incremento =
    resultado === "completado"
      ? { turnosAsistidos: { increment: 1 }, turnosTotales: { increment: 1 } }
      : { turnosNoShow: { increment: 1 }, turnosTotales: { increment: 1 } };

  const usuario = await prisma.usuario.update({
    where: { id: clienteId },
    data: incremento,
    select: { turnosAsistidos: true, turnosNoShow: true },
  });

  const total = usuario.turnosAsistidos + usuario.turnosNoShow;
  const puntaje = total > 0 ? (usuario.turnosAsistidos / total) * 100 : 100;

  await prisma.usuario.update({
    where: { id: clienteId },
    data: { puntajeAsistencia: Math.round(puntaje * 10) / 10 },
  });
}
