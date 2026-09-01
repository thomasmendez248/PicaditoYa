import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado. Por favor iniciá sesión." },
      { status: 401 }
    );
  }

  try {
    const turnos = await prisma.turno.findMany({
      where: {
        clienteId: session.user.id,
      },
      include: {
        cancha: {
          select: {
            id: true,
            nombre: true,
            capacidad: true,
            precioTurno: true,
            duracionTurnoMinutos: true,
            politicaCancelacionHoras: true,
            predio: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                telefono: true,
                politicaCancelacionHoras: true,
              },
            },
          },
        },
      },
      orderBy: [
        { fecha: "desc" },
        { horaInicio: "desc" },
      ],
    });

    return NextResponse.json({ turnos });
  } catch (error) {
    console.error("[GET /api/cliente/turnos]", error);
    return NextResponse.json(
      { error: "Error al cargar tus turnos" },
      { status: 500 }
    );
  }
}
