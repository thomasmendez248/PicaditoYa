import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cancelarTurnosPendientesVencidos } from "@/lib/turnos-expirados";

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

    // Cancelar automáticamente turnos pendientes vencidos antes de calcular estadísticas
    await cancelarTurnosPendientesVencidos(canchaIds);

    // Fechas
    const ahora = new Date();
    const hoyStr = ahora.toISOString().split("T")[0];
    const hoyDate = new Date(hoyStr);

    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

    // Últimos 7 días para ingresos por día
    const hace7Dias = new Date(hoyDate);
    hace7Dias.setDate(hace7Dias.getDate() - 6);

    // Últimos 30 días para analytics
    const hace30Dias = new Date(hoyDate);
    hace30Dias.setDate(hace30Dias.getDate() - 29);

    // Consultas en paralelo
    const [turnosHoy, turnosMes, turnosPendientes, turnosUltimos7Dias, turnosUltimos30Dias] = await Promise.all([
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: { equals: hoyDate },
          estado: { notIn: ["cancelado_a_tiempo", "cancelado_tarde"] },
        },
        include: {
          cancha: { select: { nombre: true } },
          cliente: { select: { nombre: true, apellido: true, telefono: true, email: true } },
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
          cliente: { select: { nombre: true, apellido: true, telefono: true, email: true } },
        },
        orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
      }),
      // Últimos 7 días para ingresos diarios
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: { gte: hace7Dias, lte: hoyDate },
          estado: { in: ["confirmado", "completado"] },
        },
        select: {
          fecha: true,
          precioAlMomentoReserva: true,
          canchaId: true,
          cancha: { select: { nombre: true } },
          horaInicio: true,
          clienteId: true,
          cliente: { select: { nombre: true, apellido: true } },
          nombreClienteManual: true,
        },
      }),
      // Últimos 30 días para analytics de cancelaciones y frecuencia
      prisma.turno.findMany({
        where: {
          canchaId: { in: canchaIds },
          fecha: { gte: hace30Dias, lte: hoyDate },
        },
        select: {
          estado: true,
          horaInicio: true,
          canchaId: true,
          cancha: { select: { nombre: true } },
          clienteId: true,
          cliente: { select: { nombre: true, apellido: true } },
          nombreClienteManual: true,
          precioAlMomentoReserva: true,
          fecha: true,
        },
      }),
    ]);

    // Cálculos básicos
    const turnosConfirmadosHoy = turnosHoy.filter((t) => t.estado === "confirmado" || t.estado === "completado");
    const turnosPendientesHoy = turnosHoy.filter((t) => t.estado === "pendiente");

    const ingresosHoy = turnosConfirmadosHoy.reduce((acc, t) => acc + t.precioAlMomentoReserva, 0);
    const ingresosMes = turnosMes
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .reduce((acc, t) => acc + t.precioAlMomentoReserva, 0);

    // Capacidad teórica
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

    // ── ANALYTICS AVANZADOS ──

    // 1. Ingresos por día (últimos 7 días)
    const ingresosPorDiaMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoyDate);
      d.setDate(d.getDate() - i);
      ingresosPorDiaMap.set(d.toISOString().split("T")[0], 0);
    }
    turnosUltimos7Dias.forEach((t) => {
      const key = new Date(t.fecha).toISOString().split("T")[0];
      ingresosPorDiaMap.set(key, (ingresosPorDiaMap.get(key) ?? 0) + t.precioAlMomentoReserva);
    });
    const ingresosPorDia = Array.from(ingresosPorDiaMap.entries()).map(([fecha, total]) => ({ fecha, total }));

    // 2. Ingresos por cancha (semanal y mensual)
    const ingresosPorCanchaSemanalMap = new Map<string, { nombre: string; total: number }>();
    turnosUltimos7Dias.forEach((t) => {
      const prev = ingresosPorCanchaSemanalMap.get(t.canchaId) ?? { nombre: t.cancha.nombre, total: 0 };
      ingresosPorCanchaSemanalMap.set(t.canchaId, { nombre: prev.nombre, total: prev.total + t.precioAlMomentoReserva });
    });
    const ingresosPorCanchaSemanal = Array.from(ingresosPorCanchaSemanalMap.values()).sort((a, b) => b.total - a.total);

    const ingresosPorCanchaMensualMap = new Map<string, { nombre: string; total: number }>();
    turnosUltimos30Dias
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .forEach((t) => {
        const prev = ingresosPorCanchaMensualMap.get(t.canchaId) ?? { nombre: t.cancha.nombre, total: 0 };
        ingresosPorCanchaMensualMap.set(t.canchaId, { nombre: prev.nombre, total: prev.total + t.precioAlMomentoReserva });
      });
    const ingresosPorCanchaMensual = Array.from(ingresosPorCanchaMensualMap.values()).sort((a, b) => b.total - a.total);

    // 3. Horarios más vendidos (últimos 30 días, confirmados/completados)
    const horarioCountMap = new Map<string, number>();
    turnosUltimos30Dias
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .forEach((t) => {
        horarioCountMap.set(t.horaInicio, (horarioCountMap.get(t.horaInicio) ?? 0) + 1);
      });
    const horariosMasVendidos = Array.from(horarioCountMap.entries())
      .map(([hora, cantidad]) => ({ hora, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // 4. Clientes frecuentes (últimos 30 días, por clienteId o nombre manual)
    const clienteCountMap = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
    turnosUltimos30Dias
      .filter((t) => t.estado === "confirmado" || t.estado === "completado")
      .forEach((t) => {
        const key = t.clienteId ?? `manual:${t.nombreClienteManual ?? "Anónimo"}`;
        const nombreCompleto = t.clienteId
          ? [t.cliente?.nombre, t.cliente?.apellido].filter(Boolean).join(" ")
          : (t.nombreClienteManual ?? "Anónimo");
        const prev = clienteCountMap.get(key) ?? { nombre: nombreCompleto, cantidad: 0, ingresos: 0 };
        clienteCountMap.set(key, {
          nombre: prev.nombre,
          cantidad: prev.cantidad + 1,
          ingresos: prev.ingresos + t.precioAlMomentoReserva,
        });
      });
    const clientesFrecuentes = Array.from(clienteCountMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // 5. Cancelaciones (últimos 30 días)
    const cancelacionesMes = turnosUltimos30Dias.filter(
      (t) => t.estado === "cancelado_a_tiempo" || t.estado === "cancelado_tarde"
    ).length;
    const confirmadosMes = turnosUltimos30Dias.filter(
      (t) => t.estado === "confirmado" || t.estado === "completado"
    ).length;
    const tasaCancelacion = (confirmadosMes + cancelacionesMes) > 0
      ? Math.round((cancelacionesMes / (confirmadosMes + cancelacionesMes)) * 100)
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
      // Analytics avanzados
      analytics: {
        ingresosPorDia,
        ingresosPorCancha: {
          semanal: ingresosPorCanchaSemanal,
          mensual: ingresosPorCanchaMensual,
        },
        horariosMasVendidos,
        clientesFrecuentes,
        cancelacionesMes,
        confirmadosMes,
        tasaCancelacion,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
