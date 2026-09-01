import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/super-admin/admins
 * Devuelve todos los usuarios con rol "admin", incluyendo sus predios y estado de pago.
 * Solo accesible por super_admin.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admins = await prisma.usuario.findMany({
    where: { rol: "admin" },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      fechaCreacion: true,
      predioAdminDe: {
        select: {
          id: true,
          nombre: true,
          estado: true,
          canchas: { select: { id: true } },
          pagosAbono: {
            orderBy: { mesCorrespondiente: "desc" },
            take: 1,
            select: {
              estado: true,
              mesCorrespondiente: true,
              monto: true,
              fechaPago: true,
            },
          },
        },
      },
    },
    orderBy: { fechaCreacion: "desc" },
  });

  return NextResponse.json({ admins });
}

/**
 * PATCH /api/super-admin/admins
 * Habilita o deshabilita la cuenta de un admin cambiando el estado de sus predios.
 * Body: { adminId: string, accion: "habilitar" | "deshabilitar" }
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { adminId, accion } = body;

  if (!adminId || !["habilitar", "deshabilitar"].includes(accion)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const nuevoEstado = accion === "habilitar" ? "activo" : "inactivo";

  await prisma.predio.updateMany({
    where: { adminId },
    data: { estado: nuevoEstado },
  });

  return NextResponse.json({ ok: true, nuevoEstado });
}

/**
 * POST /api/super-admin/admins
 * Crea una nueva cuenta de administrador de complejo.
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

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);

    const nuevoAdmin = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol: "admin",
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    return NextResponse.json({ ok: true, admin: nuevoAdmin }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/super-admin/admins]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
