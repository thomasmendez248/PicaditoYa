import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarEstadoPrediosAdmin } from "@/lib/membresias";

/**
 * GET /api/super-admin/admins
 * Devuelve todos los usuarios con rol "admin", incluyendo sus predios, plan y estado de suscripción.
 * Solo accesible por super_admin.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const adminsRaw = await prisma.usuario.findMany({
    where: { rol: "admin" },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      activo: true,
      fechaCreacion: true,
      fechaVencimientoSuscripcion: true,
      planMembresia: {
        select: { id: true, nombre: true, maxPredios: true, precioMensual: true },
      },
      predioAdminDe: {
        select: {
          id: true,
          nombre: true,
          estado: true,
          canchas: { select: { id: true } },
        },
      },
      pagosAbono: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, estado: true, mesCorrespondiente: true, monto: true, fechaPago: true, createdAt: true, diasSumados: true },
      },
    },
    orderBy: { fechaCreacion: "desc" },
  });

  const ahora = new Date();
  for (const admin of adminsRaw) {
    let fechaVenc = admin.fechaVencimientoSuscripcion;
    const ultimoPago = admin.pagosAbono[0];

    if (ultimoPago && (ultimoPago.fechaPago || ultimoPago.createdAt)) {
      const basePago = new Date(ultimoPago.fechaPago || ultimoPago.createdAt);
      const dias = ultimoPago.diasSumados || 30;
      const vencPorPago = new Date(basePago.getTime() + dias * 24 * 60 * 60 * 1000);

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

  return NextResponse.json({ admins: adminsRaw });
}

/**
 * PATCH /api/super-admin/admins
 * Acciones:
 *  - habilitar/deshabilitar: cambia el estado de todos los predios del admin
 *  - asignar_plan: asigna un plan de membresía al admin
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { adminId, accion } = body;

  if (!adminId || !accion) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  if (accion === "deshabilitar") {
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: adminId },
        data: { activo: false },
      }),
      prisma.predio.updateMany({
        where: { adminId },
        data: { estado: "inactivo" },
      }),
    ]);
    return NextResponse.json({ ok: true, nuevoEstado: "inactivo", activo: false });
  }

  if (accion === "habilitar") {
    await prisma.usuario.update({
      where: { id: adminId },
      data: { activo: true },
    });
    await sincronizarEstadoPrediosAdmin(adminId);
    return NextResponse.json({ ok: true, nuevoEstado: "activo", activo: true });
  }

  if (accion === "asignar_plan") {
    const { planId } = body;
    if (!planId) {
      return NextResponse.json({ error: "planId requerido" }, { status: 400 });
    }
    const admin = await prisma.usuario.update({
      where: { id: adminId },
      data: { planMembresiaId: planId },
      select: { id: true, planMembresia: { select: { nombre: true, maxPredios: true } } },
    });

    // Sincronizar predios según el cupo del nuevo plan asignado
    await sincronizarEstadoPrediosAdmin(adminId);

    return NextResponse.json({ ok: true, admin });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}

/**
 * POST /api/super-admin/admins
 * Crea una nueva cuenta de administrador de complejo.
 * Auto-asigna el plan "Free" (7 días de prueba) al crear.
 * Body: { nombre, apellido, email, password }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nombre, email, password } = body;

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios." }, { status: 400 });
    }

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    // Buscar o crear el plan "Free" (1 predio, $0, 7 días de prueba)
    const planFree = await prisma.planMembresia.upsert({
      where: { nombre: "Free" },
      update: {},
      create: {
        nombre: "Free",
        maxPredios: 1,
        precioMensual: 0,
        descripcion: "Plan de prueba gratuito con 7 días de acceso.",
        activo: true,
      },
    });

    // Vencimiento: hoy + 7 días
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);

    const nuevoAdmin = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol: "admin",
        planMembresiaId: planFree.id,
        fechaVencimientoSuscripcion: fechaVencimiento,
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    return NextResponse.json({ ok: true, admin: nuevoAdmin }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/super-admin/admins]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
