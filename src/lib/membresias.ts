import { prisma } from "@/lib/prisma";

/**
 * Sincroniza el estado de los predios de un administrador de acuerdo a:
 * 1. La vigencia de su suscripción (fechaVencimientoSuscripcion vs ahora).
 * 2. El límite de predios (maxPredios) de su plan contratado.
 *
 * Reglas de negocio:
 * - Si la suscripción venció o el admin no pagó: TODOS sus predios pasan a "pendiente_pago".
 * - Si la suscripción está activa:
 *   - Hasta `maxPredios` predios (los más antiguos) se habilitan en "activo".
 *   - Cualquier predio excedente por encima del cupo de su plan (ej. tiene 2 predios pero pasó a Plan Común de 1 predio)
 *     pasa automáticamente a "pendiente_pago" para que sus canchas NO aparezcan en las búsquedas públicas ni reciban reservas.
 */
export async function sincronizarEstadoPrediosAdmin(adminId: string) {
  const admin = await prisma.usuario.findUnique({
    where: { id: adminId },
    include: {
      planMembresia: true,
      predioAdminDe: {
        orderBy: { fechaAlta: "asc" },
      },
    },
  });

  if (!admin) return;

  // Si la cuenta del administrador fue deshabilitada por el super admin
  if (admin.activo === false) {
    await prisma.predio.updateMany({
      where: { adminId: admin.id },
      data: { estado: "inactivo" },
    });
    return;
  }

  const ahora = new Date();
  const vencido = admin.fechaVencimientoSuscripcion
    ? new Date(admin.fechaVencimientoSuscripcion) < ahora
    : true;

  if (vencido) {
    await prisma.predio.updateMany({
      where: { adminId: admin.id, estado: "activo" },
      data: { estado: "pendiente_pago" },
    });
    return;
  }

  // Admin con suscripción activa: respetar el cupo máximo de predios según su plan
  const maxPredios = admin.planMembresia?.maxPredios ?? 1;
  const predios = admin.predioAdminDe;

  for (let i = 0; i < predios.length; i++) {
    const predio = predios[i];
    if (i < maxPredios) {
      // Dentro del cupo permitido por el plan
      if (predio.estado !== "activo") {
        await prisma.predio.update({
          where: { id: predio.id },
          data: { estado: "activo" },
        });
      }
    } else {
      // Excede el cupo permitido por el plan actual (ej: Plan Común permite solo 1 predio)
      if (predio.estado === "activo") {
        await prisma.predio.update({
          where: { id: predio.id },
          data: { estado: "pendiente_pago" },
        });
      }
    }
  }
}

/**
 * Recalcula la fecha de vencimiento de suscripción y el plan de un administrador
 * en base a su historial completo de pagos aprobados.
 * Se ejecuta automáticamente al editar o eliminar un pago registrado.
 */
export async function recalcularVencimientoAdmin(adminId: string) {
  const admin = await prisma.usuario.findUnique({
    where: { id: adminId },
    include: {
      pagosAbono: {
        where: { estado: "pagado" },
        orderBy: [
          { fechaPago: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!admin) return null;

  let nuevoVencimiento: Date | null = null;
  let ultimoPlanId: string | null = admin.planMembresiaId;

  if (admin.pagosAbono.length > 0) {
    for (const pago of admin.pagosAbono) {
      const fechaBasePago = pago.fechaPago ? new Date(pago.fechaPago) : new Date(pago.createdAt);
      const dias = pago.diasSumados || 30;

      // Si no había vencimiento previo o el vencimiento previo ya venció con respecto a este pago,
      // el ciclo arranca a partir de la fecha de entrega del pago
      if (!nuevoVencimiento || nuevoVencimiento < fechaBasePago) {
        nuevoVencimiento = new Date(fechaBasePago);
      }
      nuevoVencimiento.setDate(nuevoVencimiento.getDate() + dias);

      if (pago.planId) {
        ultimoPlanId = pago.planId;
      }
    }
  } else {
    // Si no quedan pagos aprobados, el vencimiento vuelve a su fecha de prueba (7 días desde creación)
    const fechaCreacion = new Date(admin.fechaCreacion);
    const limiteFree = new Date(fechaCreacion.getTime() + 7 * 24 * 60 * 60 * 1000);
    nuevoVencimiento = limiteFree;
  }

  // Actualizar la fecha de vencimiento y plan en la base de datos
  await prisma.usuario.update({
    where: { id: adminId },
    data: {
      fechaVencimientoSuscripcion: nuevoVencimiento,
      ...(ultimoPlanId ? { planMembresiaId: ultimoPlanId } : {}),
    },
  });

  // Sincronizar estado de los predios según el nuevo vencimiento y cupo del plan
  await sincronizarEstadoPrediosAdmin(adminId);

  return nuevoVencimiento;
}
