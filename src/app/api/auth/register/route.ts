import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

/**
 * POST /api/auth/register
 * Crea un nuevo usuario con rol "cliente".
 * Body: { nombre, apellido, email, telefono, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { nombre, apellido, email, telefono, password } = parsed.data;

    // Verificar si ya existe un usuario con ese email
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Todo usuario que se registra desde la web pública es siempre de tipo "cliente" (jugador que pide turnos)
    await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        passwordHash,
        rol: "cliente",
        activo: true,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
