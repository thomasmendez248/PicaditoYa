import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando la base de datos completamente...");

  // 1. Eliminar turnos y pagos de abono
  const turnosEliminados = await prisma.turno.deleteMany();
  console.log(`- Turnos eliminados: ${turnosEliminados.count}`);

  const pagosEliminados = await prisma.pagoAbono.deleteMany();
  console.log(`- Pagos de abono eliminados: ${pagosEliminados.count}`);

  // 2. Eliminar canchas
  const canchasEliminadas = await prisma.cancha.deleteMany();
  console.log(`- Canchas eliminadas: ${canchasEliminadas.count}`);

  // 3. Desvincular predios de usuarios antes de borrar predios (para evitar ciclos FK)
  await prisma.usuario.updateMany({
    data: {
      predioId: null,
    },
  });

  // 4. Eliminar predios
  const prediosEliminados = await prisma.predio.deleteMany();
  console.log(`- Predios eliminados: ${prediosEliminados.count}`);

  // 5. Eliminar cuentas, sesiones y tokens de Auth
  const sessions = await prisma.session.deleteMany();
  console.log(`- Sesiones eliminadas: ${sessions.count}`);

  const accounts = await prisma.account.deleteMany();
  console.log(`- Cuentas OAuth eliminadas: ${accounts.count}`);

  const tokens = await prisma.verificationToken.deleteMany();
  console.log(`- Tokens de verificación eliminados: ${tokens.count}`);

  // 6. Eliminar usuarios
  const usuariosEliminados = await prisma.usuario.deleteMany();
  console.log(`- Usuarios eliminados: ${usuariosEliminados.count}`);

  console.log("\n✅ Base de datos vaciada y limpia con éxito.");
}

main()
  .catch((e) => {
    console.error("Error al limpiar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
