import { prisma } from "../src/lib/prisma";
import { sincronizarEstadoPrediosAdmin } from "../src/lib/membresias";
import { getCanchasDisponibles } from "../src/lib/disponibilidad";

async function main() {
  console.log("=== INICIANDO PRUEBA DE FLUJO DE PAGO Y VISIBILIDAD DE CANCHAS ===");

  // 1. Buscar un admin existente con predio y canchas
  const admin = await prisma.usuario.findFirst({
    where: {
      rol: "admin",
      predioAdminDe: {
        some: {
          canchas: {
            some: {},
          },
        },
      },
    },
    include: {
      predioAdminDe: {
        include: {
          canchas: true,
        },
      },
      planMembresia: true,
    },
  });

  if (!admin) {
    console.log("No se encontró ningún admin con predio y canchas.");
    return;
  }

  const predio = admin.predioAdminDe[0];
  const cancha = predio.canchas[0];
  console.log(`Admin encontrado: ${admin.email} (ID: ${admin.id})`);
  console.log(`Predio: ${predio.nombre} (ID: ${predio.id}), Cancha: ${cancha.nombre} (ID: ${cancha.id})`);

  // Guardar estado original
  const originalActivo = admin.activo;
  const originalVencimiento = admin.fechaVencimientoSuscripcion;
  const originalEstadoPredio = predio.estado;

  try {
    // ESCENARIO 1: Suscripción vencida
    console.log("\n--- Escenario 1: Suscripción Vencida ---");
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { fechaVencimientoSuscripcion: ayer, activo: true },
    });
    await sincronizarEstadoPrediosAdmin(admin.id);

    let predioActualizado = await prisma.predio.findUnique({ where: { id: predio.id } });
    console.log(`Estado del predio con suscripción vencida: "${predioActualizado?.estado}" (esperado: pendiente_pago)`);

    let canchasDisponibles = await getCanchasDisponibles();
    let canchaVisible = canchasDisponibles.some((c) => c.id === cancha.id);
    console.log(`¿La cancha aparece en la búsqueda?: ${canchaVisible} (esperado: false)`);
    if (canchaVisible || predioActualizado?.estado !== "pendiente_pago") {
      throw new Error("Fallo en Escenario 1");
    }

    // ESCENARIO 2: Se registra un pago (suscripción activa a 30 días)
    console.log("\n--- Escenario 2: Se registra un pago (+30 días) ---");
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { fechaVencimientoSuscripcion: en30Dias, activo: true },
    });
    await sincronizarEstadoPrediosAdmin(admin.id);

    predioActualizado = await prisma.predio.findUnique({ where: { id: predio.id } });
    console.log(`Estado del predio tras registrar pago: "${predioActualizado?.estado}" (esperado: activo)`);

    canchasDisponibles = await getCanchasDisponibles();
    canchaVisible = canchasDisponibles.some((c) => c.id === cancha.id);
    console.log(`¿La cancha vuelve a aparecer en la búsqueda?: ${canchaVisible} (esperado: true)`);
    if (!canchaVisible || predioActualizado?.estado !== "activo") {
      throw new Error("Fallo en Escenario 2");
    }

    // ESCENARIO 3: Super Admin deshabilita al admin
    console.log("\n--- Escenario 3: Super Admin deshabilita la cuenta del admin ---");
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { activo: false },
    });
    await sincronizarEstadoPrediosAdmin(admin.id);

    predioActualizado = await prisma.predio.findUnique({ where: { id: predio.id } });
    console.log(`Estado del predio con admin deshabilitado: "${predioActualizado?.estado}" (esperado: inactivo)`);

    canchasDisponibles = await getCanchasDisponibles();
    canchaVisible = canchasDisponibles.some((c) => c.id === cancha.id);
    console.log(`¿La cancha aparece en la búsqueda?: ${canchaVisible} (esperado: false)`);
    if (canchaVisible || predioActualizado?.estado !== "inactivo") {
      throw new Error("Fallo en Escenario 3");
    }

    // ESCENARIO 4: Super Admin vuelve a habilitar al admin (con suscripción vigente)
    console.log("\n--- Escenario 4: Super Admin vuelve a habilitar al admin ---");
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { activo: true },
    });
    await sincronizarEstadoPrediosAdmin(admin.id);

    predioActualizado = await prisma.predio.findUnique({ where: { id: predio.id } });
    console.log(`Estado del predio tras re-habilitar al admin: "${predioActualizado?.estado}" (esperado: activo)`);

    canchasDisponibles = await getCanchasDisponibles();
    canchaVisible = canchasDisponibles.some((c) => c.id === cancha.id);
    console.log(`¿La cancha vuelve a aparecer en la búsqueda?: ${canchaVisible} (esperado: true)`);
    if (!canchaVisible || predioActualizado?.estado !== "activo") {
      throw new Error("Fallo en Escenario 4");
    }

    console.log("\n>>> ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! <<<");
  } finally {
    // Restaurar datos originales
    console.log("\nRestaurando estado original del admin y predio...");
    await prisma.usuario.update({
      where: { id: admin.id },
      data: {
        activo: originalActivo,
        fechaVencimientoSuscripcion: originalVencimiento,
      },
    });
    await prisma.predio.update({
      where: { id: predio.id },
      data: { estado: originalEstadoPredio },
    });
    console.log("Restauración completada.");
  }
}

main()
  .catch((e) => {
    console.error("Error en la prueba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
