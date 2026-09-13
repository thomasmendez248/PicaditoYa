import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cambiarPasswordSchema } from "@/lib/validations/admin";
import bcrypt from "bcryptjs";

/**
 * PUT /api/usuario/cambiar-password
 * Permite a cualquier usuario autenticado cambiar su contraseña.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = cambiarPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos inválidos";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { passwordActual, passwordNueva } = parsed.data;

    // Obtener el usuario con su hash actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!usuario || !usuario.passwordHash) {
      return NextResponse.json(
        { error: "No se puede cambiar la contraseña de esta cuenta." },
        { status: 400 }
      );
    }

    // Verificar contraseña actual
    const passwordOk = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta." },
        { status: 403 }
      );
    }

    // Hashear y guardar la nueva contraseña
    const nuevoHash = await bcrypt.hash(passwordNueva, 12);

    await prisma.usuario.update({
      where: { id: session.user.id },
      data: { passwordHash: nuevoHash },
    });

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    console.error("[PUT /api/usuario/cambiar-password]", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña" }, { status: 500 });
  }
}
