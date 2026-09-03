import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarEstadoPrediosAdmin, recalcularVencimientoAdmin } from "@/lib/membresias";

/** GET /api/super-admin/abonos - Lista admins con vencimiento y último pago */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const adminsRaw = await prisma.usuario.findMany({
      where: { rol: "admin" },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        fechaVencimientoSuscripcion: true,
        planMembresia: {
          select: { id: true, nombre: true, precioMensual: true, maxPredios: true },
        },
        predioAdminDe: {
          select: { id: true, nombre: true, estado: true },
          orderBy: { fechaAlta: "asc" },
        },
        pagosAbono: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, monto: true, createdAt: true, fechaPago: true, diasSumados: true, estado: true },
        },
      },
      orderBy: { fechaCreacion: "desc" },
    });

    const ahora = new Date();

    // Sincronizar vencimiento si el último pago fue editado y sincronizar estado de predios
    for (const admin of adminsRaw) {
      let fechaVenc = admin.fechaVencimientoSuscripcion;
      const ultimoPago = admin.pagosAbono[0];

      if (ultimoPago && (ultimoPago.fechaPago || ultimoPago.createdAt)) {
        const basePago = new Date(ultimoPago.fechaPago || ultimoPago.createdAt);
        const dias = ultimoPago.diasSumados || 30;
        const vencPorPago = new Date(basePago.getTime() + dias * 24 * 60 * 60 * 1000);

        // Si difiere por más de 1 hora del guardado, sincronizar
        if (!fechaVenc || Math.abs(vencPorPago.getTime() - new Date(fechaVenc).getTime()) > 3600000) {
          fechaVenc = vencPorPago;
          await prisma.usuario.update({
            where: { id: admin.id },
            data: { fechaVencimientoSuscripcion: vencPorPago },
          });
          admin.fechaVencimientoSuscripcion = vencPorPago;
        }
      }

      // Sincronizar estado de predios respetando límite del plan y vencimiento
      await sincronizarEstadoPrediosAdmin(admin.id);
    }

    // Obtener planes activos
    const planes = await prisma.planMembresia.findMany({
      where: { activo: true },
      orderBy: { precioMensual: "asc" },
      select: { id: true, nombre: true, precioMensual: true, maxPredios: true },
    });

    // Obtener historial completo de pagos ordenados por fecha
    const pagos = await prisma.pagoAbono.findMany({
      orderBy: [
        { fechaPago: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        adminId: true,
        planId: true,
        monto: true,
        estado: true,
        fechaPago: true,
        diasSumados: true,
        createdAt: true,
        admin: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        plan: {
          select: { id: true, nombre: true, precioMensual: true },
        },
      },
    });

    return NextResponse.json({ admins: adminsRaw, planes, pagos });
  } catch (error) {
    console.error("[GET /api/super-admin/abonos]", error);
    return NextResponse.json({ error: "Error al cargar datos" }, { status: 500 });
  }
}

/** POST /api/super-admin/abonos - Registra un pago y suma días al admin */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { adminId, planId, monto, fechaPago, diasAdicionales = 30 } = await request.json();

    if (!adminId || typeof monto !== "number") {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const admin = await prisma.usuario.findUnique({
      where: { id: adminId, rol: "admin" },
      select: { fechaVencimientoSuscripcion: true, planMembresiaId: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    const hoy = new Date();
    // Fecha en que se realizó/entregó el pago
    const fechaPagoEfectiva = fechaPago ? new Date(fechaPago) : hoy;

    // Calcular nueva fecha de vencimiento:
    // Si la suscripción actual sigue activa en el futuro respecto a hoy, extendemos desde esa fecha.
    // Si ya venció (o no tenía fecha), extendemos a partir de la fecha del pago.
    let fechaBase = fechaPagoEfectiva;
    if (admin.fechaVencimientoSuscripcion && new Date(admin.fechaVencimientoSuscripcion) > hoy) {
      fechaBase = new Date(admin.fechaVencimientoSuscripcion);
    }

    const nuevaFechaVencimiento = new Date(fechaBase);
    nuevaFechaVencimiento.setDate(nuevaFechaVencimiento.getDate() + Number(diasAdicionales));

    const targetPlanId = planId || admin.planMembresiaId;

    const [pago, adminActualizado] = await prisma.$transaction([
      prisma.pagoAbono.create({
        data: {
          adminId,
          planId: targetPlanId,
          mesCorrespondiente: fechaPagoEfectiva,
          monto,
          estado: "pagado",
          fechaPago: fechaPagoEfectiva,
          diasSumados: Number(diasAdicionales),
        },
      }),
      prisma.usuario.update({
        where: { id: adminId },
        data: {
          fechaVencimientoSuscripcion: nuevaFechaVencimiento,
          ...(planId ? { planMembresiaId: planId } : {}),
        },
      }),
    ]);

    // Sincronizar estado de predios respetando límite del plan y nueva fecha
    await sincronizarEstadoPrediosAdmin(adminId);

    return NextResponse.json({ pago, admin: adminActualizado });
  } catch (error) {
    console.error("[POST /api/super-admin/abonos]", error);
    return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 });
  }
}

/** PATCH /api/super-admin/abonos - Modifica días manualmente (sumar o restar) */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { adminId, accion, dias } = await request.json();

    if (!adminId || !accion || typeof dias !== "number") {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const admin = await prisma.usuario.findUnique({
      where: { id: adminId, rol: "admin" },
      select: { fechaVencimientoSuscripcion: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    const fechaBase = admin.fechaVencimientoSuscripcion ?? new Date();
    const nuevaFecha = new Date(fechaBase);

    if (accion === "sumar") {
      nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    } else if (accion === "restar") {
      nuevaFecha.setDate(nuevaFecha.getDate() - dias);
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const adminActualizado = await prisma.usuario.update({
      where: { id: adminId },
      data: { fechaVencimientoSuscripcion: nuevaFecha },
    });

    // Sincronizar estado de predios respetando límite del plan y nueva fecha
    await sincronizarEstadoPrediosAdmin(adminId);

    return NextResponse.json({ admin: adminActualizado });
  } catch (error) {
    console.error("[PATCH /api/super-admin/abonos]", error);
    return NextResponse.json({ error: "Error al modificar días" }, { status: 500 });
  }
}

/** PUT /api/super-admin/abonos - Edita un pago registrado y recalcula vencimiento */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id, monto, planId, fechaPago, diasSumados, estado } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 });
    }

    const pagoExistente = await prisma.pagoAbono.findUnique({
      where: { id },
      select: { adminId: true },
    });

    if (!pagoExistente) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const fechaEfectiva = fechaPago ? new Date(fechaPago) : undefined;

    const pagoActualizado = await prisma.pagoAbono.update({
      where: { id },
      data: {
        ...(typeof monto === "number" ? { monto } : {}),
        ...(planId !== undefined ? { planId: planId || null } : {}),
        ...(fechaEfectiva ? { fechaPago: fechaEfectiva, mesCorrespondiente: fechaEfectiva } : {}),
        ...(typeof diasSumados === "number" ? { diasSumados } : {}),
        ...(estado ? { estado } : {}),
      },
    });

    // Recalcular vencimiento del admin con los nuevos datos del pago
    const nuevoVencimiento = await recalcularVencimientoAdmin(pagoExistente.adminId);

    return NextResponse.json({ pago: pagoActualizado, nuevoVencimiento });
  } catch (error) {
    console.error("[PUT /api/super-admin/abonos]", error);
    return NextResponse.json({ error: "Error al actualizar pago" }, { status: 500 });
  }
}

/** DELETE /api/super-admin/abonos - Elimina un pago registrado y recalcula vencimiento */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "ID de pago requerido" }, { status: 400 });
    }

    const pagoExistente = await prisma.pagoAbono.findUnique({
      where: { id },
      select: { adminId: true },
    });

    if (!pagoExistente) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    await prisma.pagoAbono.delete({
      where: { id },
    });

    // Recalcular vencimiento del admin tras eliminar el pago
    const nuevoVencimiento = await recalcularVencimientoAdmin(pagoExistente.adminId);

    return NextResponse.json({ ok: true, adminId: pagoExistente.adminId, nuevoVencimiento });
  } catch (error) {
    console.error("[DELETE /api/super-admin/abonos]", error);
    return NextResponse.json({ error: "Error al eliminar el pago" }, { status: 500 });
  }
}

