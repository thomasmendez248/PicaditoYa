import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const predioId = searchParams.get("predioId");

  if (!predioId) {
    return NextResponse.json({ error: "predioId es requerido" }, { status: 400 });
  }

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    const predio = await prisma.predio.findFirst({
      where: isSuperAdmin ? { id: predioId } : { id: predioId, adminId: session.user.id },
      include: {
        canchas: true,
      },
    });

    if (!predio) {
      return NextResponse.json({ error: "Predio no encontrado o sin permisos" }, { status: 404 });
    }

    const canchaIds = predio.canchas.map((c) => c.id);

    // Fechas
    const ahora = new Date();
    const hoyStr = ahora.toISOString().split("T")[0];
    const hoyDate = new Date(hoyStr);

    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

    // Consultas en paralelo para eliminar cascada de base de datos
    const [turnosHoy, turnosMes, turnosPendientes] = await Promise.all([
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: { equals: hoyDate },
          estado: { notIn: ["cancelado_a_tiempo", "cancelado_tarde"] },
        },
        include: {
          cancha: { select: { nombre: true } },
          cliente: { select: { nombre: true, telefono: true, email: true } },
        },
        orderBy: { horaInicio: "asc" },
      }),
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: {
            gte: primerDiaMes,
            lte: ultimoDiaMes,
          },
          estado: { notIn: ["cancelado_a_tiempo", "cancelado_tarde"] },
        },
      }),
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: { gte: hoyDate },
          estado: "pendiente",
        },
        include: {
          cancha: { select: { nombre: true } },
          cliente: { select: { nombre: true, telefono: true, email: true } },
        },
        orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
      }),
    ]);

    // Cálculos
    const turnosConfirmadosHoy = turnosHoy.filter((t) => t.estado === "confirmado" || t.estado === "completado");
    const turnosPendientesHoy = turnosHoy.filter((t) => t.estado === "pendiente");

    const ingresosHoy = turnosConfirmadosHoy.reduce((acc, t) => acc + t.precioAlMomentoReserva, 0);
    const ingresosMes = turnosMes
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .reduce((acc, t) => acc + t.precioAlMomentoReserva, 0);

    // Capacidad teórica total de turnos de hoy
    // Sumamos slots posibles por cancha
    let slotsPosiblesTotal = 0;
    predio.canchas.forEach((c) => {
      const [aperturaH] = c.horarioApertura.split(":").map(Number);
      const [cierreH] = c.horarioCierre.split(":").map(Number);
      const duracionH = (c.duracionTurnoMinutos || 60) / 60;
      const horasOperativas = Math.max(0, cierreH - aperturaH);
      slotsPosiblesTotal += Math.floor(horasOperativas / duracionH);
    });

    const ocupacionHoyPorcentaje = slotsPosiblesTotal > 0
      ? Math.min(100, Math.round((turnosHoy.length / slotsPosiblesTotal) * 100))
      : 0;

    return NextResponse.json({
      predio: {
        id: predio.id,
        nombre: predio.nombre,
        direccion: predio.direccion,
      },
      totalCanchas: predio.canchas.length,
      turnosHoyTotal: turnosHoy.length,
      turnosConfirmadosHoy: turnosConfirmadosHoy.length,
      turnosPendientesHoy: turnosPendientesHoy.length,
      ingresosHoy,
      ingresosMes,
      ocupacionHoyPorcentaje,
      proximosTurnosHoy: turnosHoy,
      turnosPendientes,
    });
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
