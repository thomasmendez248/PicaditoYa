import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanchasDisponibles } from "@/lib/disponibilidad";

/**
 * GET /api/disponibilidad
 * Query params: fecha (YYYY-MM-DD), horaInicio (HH:mm), horaFin (HH:mm), nombre (opcional)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const fecha = searchParams.get("fecha");
  const horaInicio = searchParams.get("horaInicio");
  const horaFin = searchParams.get("horaFin");
  const nombre = searchParams.get("nombre") ?? undefined;

  if (!fecha || !horaInicio || !horaFin) {
    return NextResponse.json(
      { error: "Se requieren fecha, horaInicio y horaFin" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);
  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  try {
    const canchas = await getCanchasDisponibles(
      fechaDate,
      horaInicio,
      horaFin,
      nombre
    );

    return NextResponse.json({ canchas });
  } catch (error) {
    console.error("[GET /api/disponibilidad]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
