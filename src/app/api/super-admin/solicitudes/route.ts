import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const solicitudes = await prisma.solicitudRegistro.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        adminCreado: {
          select: {
            id: true,
            nombre: true,
            email: true,
            activo: true,
          },
        },
      },
    });

    const stats = {
      total: solicitudes.length,
      pendientes: solicitudes.filter((s) => s.estado === "pendiente").length,
      aprobadas: solicitudes.filter((s) => s.estado === "aprobada").length,
      rechazadas: solicitudes.filter((s) => s.estado === "rechazada").length,
    };

    return NextResponse.json({ solicitudes, stats });
  } catch (error) {
    console.error("[GET /api/super-admin/solicitudes]", error);
    return NextResponse.json(
      { error: "Error al obtener las solicitudes" },
      { status: 500 }
    );
  }
}
