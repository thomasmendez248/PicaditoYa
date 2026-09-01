import { PrismaClient, RolUsuario, EstadoTurno, EstadoPredio } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // 1. Crear o actualizar usuario Cliente
  const cliente = await prisma.usuario.upsert({
    where: { email: "jugador@test.com" },
    update: {
      nombre: "Carlos Gómez",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-987-6543",
    },
    create: {
      email: "jugador@test.com",
      nombre: "Carlos Gómez",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-987-6543",
    },
  });

  console.log(" Usuario cliente creado/actualizado:", cliente.email);

  // 2. Buscar o crear un predio y cancha para asociarle turnos de prueba
  let predio = await prisma.predio.findFirst({
    where: { estado: EstadoPredio.activo },
    include: { canchas: true },
  });

  if (!predio) {
    // Si no hay predio, buscamos admin
    let admin = await prisma.usuario.findFirst({
      where: { rol: RolUsuario.admin },
    });

    if (!admin) {
      admin = await prisma.usuario.create({
        data: {
          email: "admin@test.com",
          nombre: "Admin Principal",
          passwordHash,
          rol: RolUsuario.admin,
        },
      });
    }

    predio = await prisma.predio.create({
      data: {
        nombre: "Complejo Deportivo El Golazo",
        direccion: "Av. Colón 4500, Córdoba",
        telefono: "351-555-1234",
        latitud: -31.4201,
        longitud: -64.1888,
        estado: EstadoPredio.activo,
        politicaCancelacionHoras: 12,
        adminId: admin.id,
      },
      include: { canchas: true },
    });
  }

  // Verificar si tiene canchas
  let cancha = predio.canchas[0];
  if (!cancha) {
    cancha = await prisma.cancha.create({
      data: {
        predioId: predio.id,
        nombre: "Cancha 1 (Sintético)",
        capacidad: 10,
        precioTurno: 24000,
        duracionTurnoMinutos: 60,
        horarioApertura: "14:00",
        horarioCierre: "23:00",
        diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  }

  // 3. Crear turnos de prueba para el cliente (uno próximo confirmado, uno pendiente, uno completado)
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 2);

  const pasado = new Date(hoy);
  pasado.setDate(pasado.getDate() - 5);

  // Limpiar turnos de prueba previos de este cliente para no duplicar
  await prisma.turno.deleteMany({
    where: { clienteId: cliente.id },
  });

  // Turno Próximo Confirmado
  await prisma.turno.create({
    data: {
      canchaId: cancha.id,
      clienteId: cliente.id,
      fecha: manana,
      horaInicio: "20:00",
      horaFin: "21:00",
      estado: EstadoTurno.confirmado,
      precioAlMomentoReserva: cancha.precioTurno,
    },
  });

  // Turno Pendiente
  const pasadoManana = new Date(hoy);
  pasadoManana.setDate(pasadoManana.getDate() + 4);
  await prisma.turno.create({
    data: {
      canchaId: cancha.id,
      clienteId: cliente.id,
      fecha: pasadoManana,
      horaInicio: "21:00",
      horaFin: "22:00",
      estado: EstadoTurno.pendiente,
      precioAlMomentoReserva: cancha.precioTurno,
    },
  });

  // Turno Historial Completado
  await prisma.turno.create({
    data: {
      canchaId: cancha.id,
      clienteId: cliente.id,
      fecha: pasado,
      horaInicio: "19:00",
      horaFin: "20:00",
      estado: EstadoTurno.completado,
      precioAlMomentoReserva: cancha.precioTurno,
    },
  });

  console.log(" Turnos de prueba creados exitosamente para", cliente.email);
}

main()
  .catch((e) => {
    console.error("Error al crear usuario de prueba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
