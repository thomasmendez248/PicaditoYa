import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/super-admin/planes - Lista todos los planes */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const planes = await prisma.planMembresia.findMany({
    include: {
      _count: { select: { usuarios: true } },
    },
    orderBy: { precioMensual: "asc" },
  });

  return NextResponse.json({ planes });
}

/** POST /api/super-admin/planes - Crea un nuevo plan */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { nombre, maxPredios, precioMensual, descripcion } = await request.json();

  if (!nombre || typeof maxPredios !== "number" || typeof precioMensual !== "number") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const plan = await prisma.planMembresia.create({
      data: { nombre, maxPredios, precioMensual, descripcion: descripcion || null },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "El nombre del plan ya existe" }, { status: 409 });
  }
}

/** PATCH /api/super-admin/planes - Edita un plan existente */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { planId, nombre, maxPredios, precioMensual, descripcion, activo } = await request.json();

  if (!planId) {
    return NextResponse.json({ error: "planId requerido" }, { status: 400 });
  }

  const plan = await prisma.planMembresia.update({
    where: { id: planId },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(maxPredios !== undefined && { maxPredios }),
      ...(precioMensual !== undefined && { precioMensual }),
      ...(descripcion !== undefined && { descripcion }),
      ...(activo !== undefined && { activo }),
    },
  });

  return NextResponse.json({ plan });
}

/** DELETE /api/super-admin/planes - Elimina un plan (solo si no tiene admins) */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");

  if (!planId) {
    return NextResponse.json({ error: "planId requerido" }, { status: 400 });
  }

  const count = await prisma.usuario.count({ where: { planMembresiaId: planId } });
  if (count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} admin(s) tienen este plan asignado.` },
      { status: 409 }
    );
  }

  await prisma.planMembresia.delete({ where: { id: planId } });
  return NextResponse.json({ ok: true });
}
