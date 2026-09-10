import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { adminTurnoSchema } from "@/lib/validations/admin";
import { checkDisponibilidad } from "@/lib/disponibilidad";
import { cancelarTurnosPendientesVencidos } from "@/lib/turnos-expirados";
import { verificarYEnviarRecordatorios30Min } from "@/lib/recordatorios-turnos";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const canchaId = searchParams.get("canchaId");
  const predioId = searchParams.get("predioId");
  const fecha = searchParams.get("fecha");
  const estado = searchParams.get("estado");
  const busqueda = searchParams.get("busqueda");
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const esFijo = searchParams.get("esFijo");
  const modoExplorador = searchParams.get("modoExplorador") === "true";

  const isSuperAdmin = session.user.rol === "super_admin";

  try {
    // Cancelar automáticamente turnos pendientes vencidos y enviar recordatorios de 30 min
    await Promise.all([
      cancelarTurnosPendientesVencidos(),
      verificarYEnviarRecordatorios30Min(),
    ]);
    // Si viene en modo turnero simple (canchaId + fecha y sin modoExplorador)
    if (canchaId && fecha && !modoExplorador && !estado && !busqueda) {
      const fechaDate = new Date(fecha);
      if (isNaN(fechaDate.getTime())) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
      }

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
          fecha: { equals: fechaDate },
          estado: { notIn: ["cancelado_a_tiempo", "cancelado_tarde"] },
        },
        include: {
          cliente: {
            select: { id: true, nombre: true, email: true, telefono: true },
          },
        },
        orderBy: { horaInicio: "asc" },
      });

      return NextResponse.json({ turnos, cancha });
    }

    // Modo Explorador y Filtros avanzados
    const where: any = {};

    if (canchaId) {
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
      where.canchaId = canchaId;
    } else if (predioId) {
      const predio = await prisma.predio.findUnique({
        where: { id: predioId },
      });
      if (!predio) {
        return NextResponse.json({ error: "Predio no encontrado" }, { status: 404 });
      }
      if (!isSuperAdmin && predio.adminId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos para este predio" }, { status: 403 });
      }
      where.cancha = { predioId };
    } else if (!isSuperAdmin) {
      where.cancha = { predio: { adminId: session.user.id } };
    }

    // Filtro de Fecha
    if (fecha) {
      const fechaDate = new Date(fecha);
      if (!isNaN(fechaDate.getTime())) {
        where.fecha = { equals: fechaDate };
      }
    } else if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde);
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta);
    }

    // Filtro de Estado
    if (estado && estado !== "todos") {
      if (estado === "cancelados") {
        where.estado = { in: ["cancelado_a_tiempo", "cancelado_tarde"] };
      } else {
        where.estado = estado;
      }
    }

    // Filtro de Turnos Fijos
    if (esFijo === "true") {
      where.esFijo = true;
    }

    // Filtro de Búsqueda por cliente
    if (busqueda && busqueda.trim()) {
      const q = busqueda.trim();
      where.OR = [
        { nombreClienteManual: { contains: q, mode: "insensitive" } },
        { telefonoClienteManual: { contains: q, mode: "insensitive" } },
        { cliente: { nombre: { contains: q, mode: "insensitive" } } },
        { cliente: { apellido: { contains: q, mode: "insensitive" } } },
        { cliente: { email: { contains: q, mode: "insensitive" } } },
        { cliente: { telefono: { contains: q, mode: "insensitive" } } },
      ];
    }

    const turnos = await prisma.turno.findMany({
      where,
      include: {
        cancha: {
          select: {
            id: true,
            nombre: true,
            deporte: true,
            capacidad: true,
            precioTurno: true,
            predio: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                telefono: true,
              },
            },
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
          },
        },
      },
      orderBy: [
        { fecha: "desc" },
        { horaInicio: "desc" },
      ],
      take: 200,
    });

    return NextResponse.json({ turnos });
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
      esFijo,
      repeticionesSemanas,
    } = parsed.data;

    const fechaDate = new Date(fecha);
    const isSuperAdmin = session.user.rol === "super_admin";
    
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

    // ─── CREACIÓN DE TURNO FIJO (RECURRENTE POR X SEMANAS) ───────────
    if (esFijo) {
      const cantidadSemanas = Math.min(Math.max(repeticionesSemanas || 4, 1), 52);
      const grupoFijoId = `fijo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const turnosCreados: any[] = [];
      const semanasConConflicto: string[] = [];

      for (let i = 0; i < cantidadSemanas; i++) {
        // Calcular fecha sumando semanas (i * 7 días)
        const fechaOcurrencia = new Date(fechaDate);
        fechaOcurrencia.setDate(fechaOcurrencia.getDate() + (i * 7));

        const disponible = await checkDisponibilidad(canchaId, fechaOcurrencia, horaInicio, horaFin);
        if (!disponible) {
          semanasConConflicto.push(fechaOcurrencia.toISOString().split("T")[0]);
          continue;
        }

        const nuevoTurno = await prisma.turno.create({
          data: {
            canchaId,
            fecha: fechaOcurrencia,
            horaInicio,
            horaFin,
            estado: estado ?? "confirmado",
            clienteId: clienteId || null,
            nombreClienteManual: nombreClienteManual || null,
            telefonoClienteManual: telefonoClienteManual || null,
            precioAlMomentoReserva: parsed.data.precioAlMomentoReserva ?? cancha.precioTurno,
            esFijo: true,
            grupoFijoId,
          },
          include: {
            cliente: {
              select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
            },
          },
        });

        turnosCreados.push(nuevoTurno);
      }

      if (turnosCreados.length === 0) {
        return NextResponse.json(
          { error: "No se pudo crear ningún turno fijo: todos los horarios semanales están ocupados" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          turno: turnosCreados[0],
          turnosCreados,
          totalCreados: turnosCreados.length,
          semanasConConflicto,
          mensaje: `Se crearon ${turnosCreados.length} turnos fijos semanales.${semanasConConflicto.length > 0 ? ` Semanas omitidas por ocupación: ${semanasConConflicto.join(", ")}` : ""}`,
        },
        { status: 201 }
      );
    }

    // ─── CREACIÓN DE TURNO INDIVIDUAL ─────────────────────────────────
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
        clienteId: clienteId || null,
        nombreClienteManual: nombreClienteManual || null,
        telefonoClienteManual: telefonoClienteManual || null,
        precioAlMomentoReserva: parsed.data.precioAlMomentoReserva ?? cancha.precioTurno,
        esFijo: false,
        grupoFijoId: null,
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
        },
      },
    });

    return NextResponse.json({ turno }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/turnos]", error);
    return NextResponse.json({ error: "Error al crear el turno" }, { status: 500 });
  }
}
