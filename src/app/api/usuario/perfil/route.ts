import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updatePerfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre es obligatorio y debe tener al menos 2 caracteres"),
  apellido: z
    .string()
    .trim()
    .min(2, "El apellido es obligatorio y debe tener al menos 2 caracteres"),
  telefono: z
    .string()
    .trim()
    .optional()
    .nullable(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        puntajeAsistencia: true,
        turnosTotales: true,
        turnosAsistidos: true,
        turnosNoShow: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ usuario });
  } catch (error) {
    console.error("[GET /api/usuario/perfil]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updatePerfilSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos del perfil inválidos";
      return NextResponse.json(
        { error: errorMsg, details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { nombre, apellido, telefono } = parsed.data;

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        nombre,
        apellido,
        telefono: telefono ? telefono : null,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
      },
    });

    return NextResponse.json({
      usuario: usuarioActualizado,
      message: "Datos personales actualizados correctamente",
    });
  } catch (error) {
    console.error("[PUT /api/usuario/perfil]", error);
    return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 });
  }
}
