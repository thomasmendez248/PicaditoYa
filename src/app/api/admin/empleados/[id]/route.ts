import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * DELETE /api/admin/empleados/[id]
 * Desactiva (o elimina) un empleado del predio.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const empleado = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, rol: true, predioId: true },
    });

    if (!empleado || empleado.rol !== "empleado") {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Verificar que el admin es dueño del predio del empleado
    if (session.user.rol === "admin" && empleado.predioId) {
      const predio = await prisma.predio.findUnique({ where: { id: empleado.predioId } });
      if (!predio || predio.adminId !== session.user.id) {
        return NextResponse.json({ error: "Sin permisos para este empleado" }, { status: 403 });
      }
    }

    // Desactivar en lugar de eliminar para preservar auditoría
    await prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ message: "Empleado desactivado correctamente" });
  } catch (error) {
    console.error("[DELETE /api/admin/empleados/[id]]", error);
    return NextResponse.json({ error: "Error al desactivar el empleado" }, { status: 500 });
  }
}
