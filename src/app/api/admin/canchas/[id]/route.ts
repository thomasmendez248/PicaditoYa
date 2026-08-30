import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateCanchaSchema } from "@/lib/validations/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    const cancha = await prisma.cancha.findUnique({
      where: { id },
      include: {
        predio: true,
      },
    });

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (!isSuperAdmin && cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos para ver esta cancha" }, { status: 403 });
    }

    return NextResponse.json({ cancha });
  } catch (error) {
    console.error("[GET /api/admin/canchas/[id]]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    const canchaExistente = await prisma.cancha.findUnique({
      where: { id },
      include: { predio: true },
    });

    if (!canchaExistente) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (!isSuperAdmin && canchaExistente.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos para modificar esta cancha" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateCanchaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const cancha = await prisma.cancha.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ cancha });
  } catch (error) {
    console.error("[PUT /api/admin/canchas/[id]]", error);
    return NextResponse.json({ error: "Error al actualizar la cancha" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const isSuperAdmin = session.user.rol === "super_admin";

    const cancha = await prisma.cancha.findUnique({
      where: { id },
      include: { predio: true },
    });

    if (!cancha) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    if (!isSuperAdmin && cancha.predio.adminId !== session.user.id) {
      return NextResponse.json({ error: "Sin permisos para eliminar esta cancha" }, { status: 403 });
    }

    await prisma.cancha.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Cancha eliminada con éxito" });
  } catch (error) {
    console.error("[DELETE /api/admin/canchas/[id]]", error);
    return NextResponse.json({ error: "Error al eliminar la cancha" }, { status: 500 });
  }
}
