import { prisma } from "@/lib/prisma";

/**
 * Verifica si una cancha está disponible en un rango horario específico.
 *
 * Esta función es la fuente única de verdad para la lógica de disponibilidad.
 * Se usa tanto en el buscador del Home (modo consulta) como al crear un turno
 * (modo validación), garantizando que nunca queden desincronizadas.
 *
 * @param canchaId - ID de la cancha a verificar
 * @param fecha - Fecha del turno (solo la parte de fecha)
 * @param horaInicio - Hora de inicio en formato "HH:mm"
 * @param horaFin - Hora de fin en formato "HH:mm"
 * @param excludeTurnoId - ID de turno a excluir (útil para edición de turnos)
 * @returns true si la cancha está disponible, false si hay superposición
 */
export async function checkDisponibilidad(
  canchaId: string,
  fecha: Date,
  horaInicio: string,
  horaFin: string,
  excludeTurnoId?: string
): Promise<boolean> {
  // Buscamos turnos confirmados en la misma cancha y fecha que se solapen
  // con el rango horario pedido.
  //
  // Dos turnos se solapan si:
  //   turno.horaInicio < horaFin  AND  turno.horaFin > horaInicio
  //
  // Usamos raw para comparar strings "HH:mm" — funciona porque el formato
  // permite comparación lexicográfica directa.
  const turnosSolapados = await prisma.turno.count({
    where: {
      canchaId,
      fecha: {
        equals: fecha,
      },
      estado: { in: ["confirmado", "pendiente"] as any },
      AND: [
        {
          horaInicio: {
            lt: horaFin,
          },
        },
        {
          horaFin: {
            gt: horaInicio,
          },
        },
      ],
      ...(excludeTurnoId ? { id: { not: excludeTurnoId } } : {}),
    },
  });

  return turnosSolapados === 0;
}

/**
 * Devuelve las canchas disponibles de predios activos para una fecha y franja horaria.
 * Usada en el Home para el filtro de disponibilidad.
 *
 * @param fecha - Fecha a consultar
 * @param horaInicio - Hora de inicio en formato "HH:mm"
 * @param horaFin - Hora de fin en formato "HH:mm"
 * @param nombre - Filtro opcional de texto sobre nombre de cancha o predio
 * @param ciudad - Filtro opcional de texto sobre la dirección del predio
 * @param latUsuario - Latitud del usuario para filtrado por cercanía
 * @param lngUsuario - Longitud del usuario para filtrado por cercanía
 * @param distanciaMaxKm - Radio máximo en km (default: 50)
 */
export async function getCanchasDisponibles(
  fecha?: Date,
  horaInicio?: string,
  horaFin?: string,
  nombre?: string,
  ciudad?: string,
  latUsuario?: number,
  lngUsuario?: number,
  distanciaMaxKm?: number,
  capacidad?: number
) {
  // Si se proveyó horario y fecha, filtramos los turnos ocupados
  let canchasOcupadasIds: string[] = [];

  if (fecha && horaInicio && horaFin) {
    const turnosOcupados = await prisma.turno.findMany({
      where: {
        fecha: { equals: fecha },
        estado: { in: ["confirmado", "pendiente"] as any },
        horaInicio: { lt: horaFin },
        horaFin: { gt: horaInicio },
      },
      select: { canchaId: true },
    });
    canchasOcupadasIds = turnosOcupados.map((t) => t.canchaId);
  }

  // Si tenemos coordenadas del usuario, primero filtramos los predios cercanos
  // usando la fórmula de Haversine directamente en SQL para eficiencia.
  let prediosCercanosIds: string[] | undefined;

  if (latUsuario !== undefined && lngUsuario !== undefined && distanciaMaxKm) {
    const prediosCercanos = await prisma.$queryRaw<{ id: string; distancia_km: number }[]>`
      SELECT id,
        ( 6371 * acos(
            cos(radians(${latUsuario})) * cos(radians(latitud))
            * cos(radians(longitud) - radians(${lngUsuario}))
            + sin(radians(${latUsuario})) * sin(radians(latitud))
        )) AS distancia_km
      FROM predios
      WHERE estado = 'activo'
      HAVING ( 6371 * acos(
            cos(radians(${latUsuario})) * cos(radians(latitud))
            * cos(radians(longitud) - radians(${lngUsuario}))
            + sin(radians(${latUsuario})) * sin(radians(latitud))
        )) <= ${distanciaMaxKm}
      ORDER BY distancia_km ASC
    `;
    prediosCercanosIds = prediosCercanos.map((p) => p.id);

    // Si no hay predios en el radio, devolvemos vacío
    if (prediosCercanosIds.length === 0) return [];
  }

  // Si hay fecha, filtramos por día de la semana
  const diaSemana = fecha ? fecha.getDay() : undefined;

  const canchas = await prisma.cancha.findMany({
    where: {
      ...(canchasOcupadasIds.length > 0 ? { id: { notIn: canchasOcupadasIds } } : {}),
      predio: {
        estado: "activo",
        // Filtrar por ciudad/dirección si se proporcionó
        ...(ciudad
          ? { direccion: { contains: ciudad, mode: "insensitive" } }
          : {}),
        // Filtrar por predios cercanos si calculamos proximidad
        ...(prediosCercanosIds
          ? { id: { in: prediosCercanosIds } }
          : {}),
      },
      ...(diaSemana !== undefined ? { diasOperativos: { has: diaSemana } } : {}),
      ...(horaInicio ? { horarioApertura: { lte: horaInicio } } : {}),
      ...(horaFin ? { horarioCierre: { gte: horaFin } } : {}),
      ...(capacidad ? { capacidad } : {}),
      ...(nombre
        ? {
            OR: [
              { nombre: { contains: nombre, mode: "insensitive" } },
              {
                predio: { nombre: { contains: nombre, mode: "insensitive" } },
              },
            ],
          }
        : {}),
    },
    include: {
      predio: {
        select: {
          id: true,
          nombre: true,
          direccion: true,
          latitud: true,
          longitud: true,
          telefono: true,
        },
      },
    },
    orderBy: [{ predio: { nombre: "asc" } }, { nombre: "asc" }],
  });

  return canchas;
}

