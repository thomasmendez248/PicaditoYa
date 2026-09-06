import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateTurnoEstadoSchema } from "@/lib/validations/admin";
import { sendPushToUser, formatearFechaAmigable } from "@/lib/push-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
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

    if (!isSuperAdmin && turno.cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos sobre este turno" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTurnoEstadoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Estado inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const isCancelacion = parsed.data.estado === "cancelado_a_tiempo" || parsed.data.estado === "cancelado_tarde";
    const fueAprobado = parsed.data.estado === "confirmado" && turno.estado === "pendiente";

    const turnoActualizado = await prisma.turno.update({
      where: { id },
      data: {
        estado: parsed.data.estado,
        canceladoEn: isCancelacion ? new Date() : null,
      },
    });

    // Notificar al cliente cuando se le aprueba/confirma el turno
    if (fueAprobado && turno.clienteId) {
      const fechaTexto = formatearFechaAmigable(turno.fecha);
      sendPushToUser(turno.clienteId, {
        title: "¡Turno aprobado! ⚽",
        body: `Tu turno en ${turno.cancha.predio.nombre} (${turno.cancha.nombre}) para el ${fechaTexto} a las ${turno.horaInicio}hs fue aprobado.`,
        url: "/cliente/mis-turnos",
        tag: `turno-aprobado-${turno.id}`,
      }).catch((err) => console.error("[PUT /api/admin/turnos/[id]] Error al enviar push al cliente:", err));
    }

    return NextResponse.json({ turno: turnoActualizado });
  } catch (error) {
    console.error("[PUT /api/admin/turnos/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar el turno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
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

    if (!isSuperAdmin && turno.cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos sobre este turno" }, { status: 403 });
    }

    await prisma.turno.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Turno eliminado con éxito" });
  } catch (error) {
    console.error("[DELETE /api/admin/turnos/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar el turno" }, { status: 500 });
  }
}
