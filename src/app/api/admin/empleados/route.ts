import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { crearEmpleadoSchema } from "@/lib/validations/admin";
import bcrypt from "bcryptjs";

const MAX_EMPLEADOS_POR_PREDIO = 2;

/**
 * GET /api/admin/empleados?predioId=xxx
 * Lista los empleados de un predio del admin autenticado.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const predioId = searchParams.get("predioId");

  if (!predioId) {
    return NextResponse.json({ error: "predioId requerido" }, { status: 400 });
  }

  try {
    // Verificar que el predio pertenece al admin (o super_admin)
    if (session.user.rol === "admin") {
      const predio = await prisma.predio.findUnique({ where: { id: predioId } });
      if (!predio || predio.adminId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos para este predio" }, { status: 403 });
      }
    }

    const empleados = await prisma.usuario.findMany({
      where: {
        predioId,
        rol: "empleado",
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
        fechaCreacion: true,
      },
      orderBy: { fechaCreacion: "asc" },
    });

    return NextResponse.json({ empleados, maxEmpleados: MAX_EMPLEADOS_POR_PREDIO });
  } catch (error) {
    console.error("[GET /api/admin/empleados]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/admin/empleados
 * Crea un nuevo empleado vinculado a un predio. Máximo 2 por predio.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = crearEmpleadoSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos inválidos";
      return NextResponse.json({ error: errorMsg, details: parsed.error.flatten() }, { status: 400 });
    }

    const { nombre, apellido, email, telefono, password, predioId } = parsed.data;

    // Verificar que el predio pertenece al admin
    if (session.user.rol === "admin") {
      const predio = await prisma.predio.findUnique({ where: { id: predioId } });
      if (!predio || predio.adminId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos para este predio" }, { status: 403 });
      }
    }

    // Verificar límite de empleados por predio
    const cantidadEmpleados = await prisma.usuario.count({
      where: { predioId, rol: "empleado", activo: true },
    });

    if (cantidadEmpleados >= MAX_EMPLEADOS_POR_PREDIO) {
      return NextResponse.json(
        { error: `Ya hay ${MAX_EMPLEADOS_POR_PREDIO} empleados activos en este predio. No se pueden agregar más.` },
        { status: 409 }
      );
    }

    // Verificar email no duplicado
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const empleado = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        telefono: telefono || null,
        passwordHash,
        rol: "empleado",
        predioId,
        creadoPorId: session.user.id,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
        fechaCreacion: true,
      },
    });

    return NextResponse.json({ empleado }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/empleados]", error);
    return NextResponse.json({ error: "Error al crear el empleado" }, { status: 500 });
  }
}
