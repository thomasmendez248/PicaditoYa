import { PrismaClient, RolUsuario, EstadoPredio } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@test.com' },
    update: {
      passwordHash,
      rol: RolUsuario.admin,
      ...({ maxPredios: 2 } as any),
    },
    create: {
      email: 'admin@test.com',
      nombre: 'Admin Test',
      passwordHash,
      rol: RolUsuario.admin,
      ...({ maxPredios: 2 } as any),
    },
  })

  console.log('Admin user created/updated:', admin.email)

  let predio = await prisma.predio.findFirst({
    where: { adminId: admin.id }
  })

  if (!predio) {
    predio = await prisma.predio.create({
      data: {
        nombre: 'Predio Test Admin',
        direccion: 'Calle de Prueba 123',
        latitud: -34.6037,
        longitud: -58.3816,
        estado: EstadoPredio.activo,
        adminId: admin.id,
      }
    })
    console.log('Predio created:', predio.nombre)
  }

  // Actualizamos el predioId en el usuario
  await prisma.usuario.update({
    where: { id: admin.id },
    data: { predioId: predio.id }
  })

  console.log('Database seeded successfully. You can login with admin@test.com and password 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
