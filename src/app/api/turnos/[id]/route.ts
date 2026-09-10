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

      // Si estaba pendiente, se cancela directamente sin penalización
      if (turno.estado === "pendiente") {
        const turnoActualizado = await prisma.turno.update({
          where: { id },
          data: {
            estado: "cancelado_a_tiempo",
            canceladoEn: new Date(),
          },
        });

        // Notificar al admin sobre la cancelación de la solicitud
        const adminId = turno.cancha.predio.adminId;
        if (adminId) {
          const fechaTexto = formatearFechaAmigable(turno.fecha);
          const nombreCliente = session.user.name || turno.nombreClienteManual || "Un cliente";
          sendPushToUser(adminId, {
            title: "Solicitud cancelada ❌",
            body: `${nombreCliente} canceló su solicitud de turno en ${turno.cancha.nombre} para el ${fechaTexto} a las ${turno.horaInicio}hs.`,
            url: "/admin",
            tag: `solicitud-cancelada-${turno.id}`,
          }).catch((err) => console.error("[PATCH /api/turnos/[id]] Error al enviar push de cancelación al admin:", err));
        }

        return NextResponse.json({
          turno: turnoActualizado,
          mensaje: "Solicitud de turno cancelada correctamente",
        });
      }

      // Calcular horas de anticipación
      const horasAnticipacion = differenceInHours(fechaTurno, ahora);

      // La política de cancelación: usa override de cancha si existe, sino la del predio
      const politicaHoras =
        turno.cancha.politicaCancelacionHoras ??
        turno.cancha.predio.politicaCancelacionHoras;

      const esACiempo = horasAnticipacion >= politicaHoras;
      const nuevoEstado = esACiempo ? "cancelado_a_tiempo" : "cancelado_tarde";

      const turnoActualizado = await prisma.turno.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          canceladoEn: ahora,
        },
      });

      // Si fue cancelación tarde, impacta en el puntaje como no-show
      if (!esACiempo) {
        await actualizarPuntajeCliente(turno.clienteId, "no_show");
      }

      // Notificar al administrador del predio sobre la cancelación
      const adminId = turno.cancha.predio.adminId;
      if (adminId) {
        const fechaTexto = formatearFechaAmigable(turno.fecha);
        const nombreCliente = session.user.name || turno.nombreClienteManual || "Un cliente";
        sendPushToUser(adminId, {
          title: "Turno cancelado ❌",
          body: `${nombreCliente} canceló su turno en ${turno.cancha.nombre} para el ${fechaTexto} a las ${turno.horaInicio}hs.`,
          url: "/admin",
          tag: `turno-cancelado-${turno.id}`,
        }).catch((err) => console.error("[PATCH /api/turnos/[id]] Error al enviar push de cancelación al admin:", err));
      }

      return NextResponse.json({
        turno: turnoActualizado,
        mensaje: esACiempo
          ? "Turno cancelado correctamente"
          : `Turno cancelado fuera de término (mínimo ${politicaHoras}h de anticipación). Impactará en tu puntaje.`,
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
