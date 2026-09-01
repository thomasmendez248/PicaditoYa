import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const predios = await prisma.predio.findMany({
    include: {
      admin: true,
      canchas: true,
    },
  });

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
    },
  });

  console.log("=== USUARIOS ACTUALES ===");
  console.log(JSON.stringify(usuarios, null, 2));

  console.log("=== PREDIOS ACTUALES ===");
  console.log(JSON.stringify(predios, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
