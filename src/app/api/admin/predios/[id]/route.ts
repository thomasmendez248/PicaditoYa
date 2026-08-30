import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updatePredioSchema } from "@/lib/validations/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isSuperAdmin = session.user.rol === "super_admin";

  const predio = await prisma.predio.findUnique({
    where: { id },
    include: {
      canchas: true,
      _count: {
        select: { canchas: true },
      },
    },
  });

  if (!predio) {
    return NextResponse.json({ error: "Predio no encontrado" }, { status: 404 });
  }

  if (!isSuperAdmin && predio.adminId !== session.user.id) {
    return NextResponse.json({ error: "No tenés permiso para ver este predio" }, { status: 403 });
  }

  return NextResponse.json({ predio });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isSuperAdmin = session.user.rol === "super_admin";

  const predioExistente = await prisma.predio.findUnique({
    where: { id },
  });

  if (!predioExistente) {
    return NextResponse.json({ error: "Predio no encontrado" }, { status: 404 });
  }

  if (!isSuperAdmin && predioExistente.adminId !== session.user.id) {
    return NextResponse.json({ error: "No tenés permiso para editar este predio" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updatePredioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const predioActualizado = await prisma.predio.update({
      where: { id },
      data: {
        ...parsed.data,
      },
    });

    return NextResponse.json({ predio: predioActualizado });
  } catch (error) {
    console.error("[PUT /api/admin/predios/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar el predio" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isSuperAdmin = session.user.rol === "super_admin";

  const predioExistente = await prisma.predio.findUnique({
    where: { id },
  });

  if (!predioExistente) {
    return NextResponse.json({ error: "Predio no encontrado" }, { status: 404 });
  }

  if (!isSuperAdmin && predioExistente.adminId !== session.user.id) {
    return NextResponse.json({ error: "No tenés permiso para eliminar este predio" }, { status: 403 });
  }

  try {
    await prisma.predio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Predio eliminado correctamente" });
  } catch (error) {
    console.error("[DELETE /api/admin/predios/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar el predio" }, { status: 500 });
  }
}
