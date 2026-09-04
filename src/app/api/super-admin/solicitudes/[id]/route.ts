import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Helper para generar una contraseña segura y legible
function generarPasswordTemporal(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pass = "Pica";
  for (let i = 0; i < 4; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pass += Math.floor(10 + Math.random() * 90);
  return pass;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID de solicitud requerido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { accion, motivoRechazo, passwordPersonalizada } = body;

    const solicitud = await prisma.solicitudRegistro.findUnique({
      where: { id },
    });

    if (!solicitud) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (accion === "aprobar") {
      const passwordPlana = (passwordPersonalizada && passwordPersonalizada.trim().length >= 6)
        ? passwordPersonalizada.trim()
        : generarPasswordTemporal();

      const passwordHash = await bcrypt.hash(passwordPlana, 12);

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

      // Verificar si ya existe un usuario con ese email
      let adminUser = await prisma.usuario.findUnique({
        where: { email: solicitud.email.toLowerCase() },
      });

      if (adminUser) {
        // Actualizar usuario existente a admin
        adminUser = await prisma.usuario.update({
          where: { id: adminUser.id },
          data: {
            rol: "admin",
            activo: true,
            passwordHash,
            planMembresiaId: adminUser.planMembresiaId || planFree.id,
            fechaVencimientoSuscripcion: adminUser.fechaVencimientoSuscripcion || fechaVencimiento,
          },
        });
      } else {
        // Crear nuevo usuario admin
        adminUser = await prisma.usuario.create({
          data: {
            nombre: solicitud.nombreContacto,
            email: solicitud.email.toLowerCase(),
            telefono: solicitud.telefono,
            passwordHash,
            rol: "admin",
            activo: true,
            planMembresiaId: planFree.id,
            fechaVencimientoSuscripcion: fechaVencimiento,
          },
        });
      }

      // Actualizar estado de la solicitud
      const solicitudActualizada = await prisma.solicitudRegistro.update({
        where: { id },
        data: {
          estado: "aprobada",
          adminCreadoId: adminUser.id,
          fechaResolucion: new Date(),
        },
        include: {
          adminCreado: {
            select: { id: true, nombre: true, email: true, activo: true },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        mensaje: "Solicitud aprobada y usuario Administrador generado con éxito",
        credenciales: {
          email: adminUser.email,
          password: passwordPlana,
          nombre: adminUser.nombre,
          predio: solicitud.nombrePredio,
          telefono: solicitud.telefono,
        },
        solicitud: solicitudActualizada,
      });
    }

    if (accion === "rechazar") {
      const solicitudActualizada = await prisma.solicitudRegistro.update({
        where: { id },
        data: {
          estado: "rechazada",
          motivoRechazo: motivoRechazo || "No especificado",
          fechaResolucion: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        mensaje: "Solicitud rechazada",
        solicitud: solicitudActualizada,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/super-admin/solicitudes/[id]]", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
