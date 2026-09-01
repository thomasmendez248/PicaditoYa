import { PrismaClient, RolUsuario, EstadoPredio, EstadoTurno } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  console.log("Creando datos reales para pruebas...");

  // 1. Crear Administrador del nuevo predio
  const adminLaCantera = await prisma.usuario.upsert({
    where: { email: "admin@lacantera.com" },
    update: {
      nombre: "Martín Benítez",
      passwordHash,
      rol: RolUsuario.admin,
      telefono: "351-456-7890",
      maxPredios: 3,
    },
    create: {
      email: "admin@lacantera.com",
      nombre: "Martín Benítez",
      passwordHash,
      rol: RolUsuario.admin,
      telefono: "351-456-7890",
      maxPredios: 3,
    },
  });

  console.log(" Admin creado:", adminLaCantera.email);

  // 2. Crear Predio Real
  const predioLaCantera = await prisma.predio.upsert({
    where: { id: "predio-la-cantera-cba" },
    update: {
      nombre: "Complejo Deportivo La Cantera",
      direccion: "Av. Richieri 3250, Barrio Jardín, Córdoba",
      telefono: "+54 9 351 456-7890",
      latitud: -31.4485,
      longitud: -64.1812,
      estado: EstadoPredio.activo,
      politicaCancelacionHoras: 12,
      adminId: adminLaCantera.id,
    },
    create: {
      id: "predio-la-cantera-cba",
      nombre: "Complejo Deportivo La Cantera",
      direccion: "Av. Richieri 3250, Barrio Jardín, Córdoba",
      telefono: "+54 9 351 456-7890",
      latitud: -31.4485,
      longitud: -64.1812,
      estado: EstadoPredio.activo,
      politicaCancelacionHoras: 12,
      adminId: adminLaCantera.id,
    },
  });

  // Vincular predioId al admin
  await prisma.usuario.update({
    where: { id: adminLaCantera.id },
    data: { predioId: predioLaCantera.id },
  });

  console.log(" Predio creado:", predioLaCantera.nombre);

  // 3. Crear Canchas reales en el predio
  const cancha1 = await prisma.cancha.upsert({
    where: { id: "cancha-cantera-f5-1" },
    update: {
      nombre: "Cancha 1 - Sintético Pro (F5)",
      capacidad: 10,
      precioTurno: 26000,
      duracionTurnoMinutos: 60,
      horarioApertura: "15:00",
      horarioCierre: "00:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 12,
      predioId: predioLaCantera.id,
    },
    create: {
      id: "cancha-cantera-f5-1",
      nombre: "Cancha 1 - Sintético Pro (F5)",
      capacidad: 10,
      precioTurno: 26000,
      duracionTurnoMinutos: 60,
      horarioApertura: "15:00",
      horarioCierre: "00:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 12,
      predioId: predioLaCantera.id,
    },
  });

  const cancha2 = await prisma.cancha.upsert({
    where: { id: "cancha-cantera-f7-techada" },
    update: {
      nombre: "Cancha 2 - Techada Premium (F7)",
      capacidad: 14,
      precioTurno: 36000,
      duracionTurnoMinutos: 60,
      horarioApertura: "16:00",
      horarioCierre: "23:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 12,
      predioId: predioLaCantera.id,
    },
    create: {
      id: "cancha-cantera-f7-techada",
      nombre: "Cancha 2 - Techada Premium (F7)",
      capacidad: 14,
      precioTurno: 36000,
      duracionTurnoMinutos: 60,
      horarioApertura: "16:00",
      horarioCierre: "23:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 12,
      predioId: predioLaCantera.id,
    },
  });

  const cancha3 = await prisma.cancha.upsert({
    where: { id: "cancha-cantera-f11-cesped" },
    update: {
      nombre: "Cancha 3 - Césped Natural Iluminada (F11)",
      capacidad: 22,
      precioTurno: 60000,
      duracionTurnoMinutos: 60,
      horarioApertura: "17:00",
      horarioCierre: "23:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 24,
      predioId: predioLaCantera.id,
    },
    create: {
      id: "cancha-cantera-f11-cesped",
      nombre: "Cancha 3 - Césped Natural Iluminada (F11)",
      capacidad: 22,
      precioTurno: 60000,
      duracionTurnoMinutos: 60,
      horarioApertura: "17:00",
      horarioCierre: "23:00",
      diasOperativos: [0, 1, 2, 3, 4, 5, 6],
      politicaCancelacionHoras: 24,
      predioId: predioLaCantera.id,
    },
  });

  console.log(" 3 Canchas creadas en", predioLaCantera.nombre);

  // 4. Crear Usuarios Clientes (Jugadores) para pruebas
  const jugador1 = await prisma.usuario.upsert({
    where: { email: "lucas.rodriguez@test.com" },
    update: {
      nombre: "Lucas Rodríguez",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-443-2211",
      turnosTotales: 8,
      turnosAsistidos: 8,
      puntajeAsistencia: 100,
    },
    create: {
      email: "lucas.rodriguez@test.com",
      nombre: "Lucas Rodríguez",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-443-2211",
      turnosTotales: 8,
      turnosAsistidos: 8,
      puntajeAsistencia: 100,
    },
  });

  const jugador2 = await prisma.usuario.upsert({
    where: { email: "matias.lopez@test.com" },
    update: {
      nombre: "Matías López",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-778-9900",
      turnosTotales: 4,
      turnosAsistidos: 4,
      puntajeAsistencia: 100,
    },
    create: {
      email: "matias.lopez@test.com",
      nombre: "Matías López",
      passwordHash,
      rol: RolUsuario.cliente,
      telefono: "351-778-9900",
      turnosTotales: 4,
      turnosAsistidos: 4,
      puntajeAsistencia: 100,
    },
  });

  console.log(" Usuarios jugadores creados:", jugador1.email, ",", jugador2.email);

  // 5. Crear turnos de prueba para que haya disponibilidad y reservas activas
  const hoy = new Date();
  
  // Turno mañana a las 20hs para Lucas Rodríguez
  const fechaManana = new Date(hoy);
  fechaManana.setDate(fechaManana.getDate() + 1);

  await prisma.turno.upsert({
    where: { id: "turno-test-lucas-1" },
    update: {
      canchaId: cancha1.id,
      clienteId: jugador1.id,
      fecha: fechaManana,
      horaInicio: "20:00",
      horaFin: "21:00",
      estado: EstadoTurno.confirmado,
      precioAlMomentoReserva: cancha1.precioTurno,
    },
    create: {
      id: "turno-test-lucas-1",
      canchaId: cancha1.id,
      clienteId: jugador1.id,
      fecha: fechaManana,
      horaInicio: "20:00",
      horaFin: "21:00",
      estado: EstadoTurno.confirmado,
      precioAlMomentoReserva: cancha1.precioTurno,
    },
  });

  // Turno en 3 días para Matías López
  const fechaTresDias = new Date(hoy);
  fechaTresDias.setDate(fechaTresDias.getDate() + 3);

  await prisma.turno.upsert({
    where: { id: "turno-test-matias-1" },
    update: {
      canchaId: cancha2.id,
      clienteId: jugador2.id,
      fecha: fechaTresDias,
      horaInicio: "21:00",
      horaFin: "22:00",
      estado: EstadoTurno.confirmado,
      precioAlMomentoReserva: cancha2.precioTurno,
    },
    create: {
      id: "turno-test-matias-1",
      canchaId: cancha2.id,
      clienteId: jugador2.id,
      fecha: fechaTresDias,
      horaInicio: "21:00",
      horaFin: "22:00",
      estado: EstadoTurno.confirmado,
      precioAlMomentoReserva: cancha2.precioTurno,
    },
  });

  console.log(" Datos insertados con éxito en la base de datos.");
}

main()
  .catch((e) => {
    console.error("Error al poblar la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
