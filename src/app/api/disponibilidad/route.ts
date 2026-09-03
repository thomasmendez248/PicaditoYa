import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanchasDisponibles } from "@/lib/disponibilidad";

/**
 * GET /api/disponibilidad
 * Query params:
 *   - fecha (YYYY-MM-DD) — requerido
 *   - horaInicio (HH:mm) — requerido
 *   - horaFin (HH:mm) — requerido
 *   - nombre (string) — opcional, busca por nombre de cancha o predio
 *   - ciudad (string) — opcional, busca por dirección del predio
 *   - lat (number) — opcional, latitud del usuario para búsqueda por cercanía
 *   - lng (number) — opcional, longitud del usuario para búsqueda por cercanía
 *   - distancia (number) — opcional, radio máximo en km (default: 50)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const fecha = searchParams.get("fecha");
  const horaInicio = searchParams.get("horaInicio");
  const horaFin = searchParams.get("horaFin");
  const nombre = searchParams.get("nombre") ?? undefined;
  const ciudad = searchParams.get("ciudad") ?? undefined;
  const provincia = searchParams.get("provincia") ?? undefined;

  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const distanciaStr = searchParams.get("distancia");
  const capacidadStr = searchParams.get("capacidad");

  const latUsuario = latStr ? parseFloat(latStr) : undefined;
  const lngUsuario = lngStr ? parseFloat(lngStr) : undefined;
  const distanciaMaxKm = distanciaStr ? parseFloat(distanciaStr) : undefined;
  const capacidad = capacidadStr ? parseInt(capacidadStr, 10) : undefined;

  let fechaDate: Date | undefined = undefined;
  if (fecha) {
    fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      fechaDate = undefined;
    }
  }

  try {
    const canchas = await getCanchasDisponibles(
      fechaDate,
      horaInicio || undefined,
      horaFin || undefined,
      nombre,
      ciudad,
      latUsuario,
      lngUsuario,
      distanciaMaxKm,
      capacidad,
      provincia
    );

    return NextResponse.json({ canchas });
  } catch (error) {
    console.error("[GET /api/disponibilidad]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

