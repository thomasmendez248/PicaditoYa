import { prisma } from "@/lib/prisma";

/**
 * Normaliza un texto para búsquedas: elimina acentos y pasa a minúsculas.
 * Ej: "Córdoba" -> "cordoba", "BUENOS AIRES" -> "buenos aires"
 */
function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")                        // descompone letras + diacríticos
    .replace(/[\u0300-\u036f]/g, "")         // elimina los diacríticos
    .toLowerCase();
}

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
  const ciudadLimpia = ciudad?.trim() || "";
  const nombreLimpio = nombre?.trim() || "";

  // 1. Si se proveyó horario y fecha, buscamos turnos ocupados
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

  // 2. Filtros avanzados concurrentes (cercanía geoespacial, ciudad sin acentos, nombre sin acentos)
  const [prediosCercanosIds, prediosPorCiudadIds, canchasPorNombreIds] = await Promise.all([
    // A. Cercanía con Bounding Box + Haversine
    (async (): Promise<string[] | undefined> => {
      if (latUsuario !== undefined && lngUsuario !== undefined && distanciaMaxKm) {
        const deltaLat = distanciaMaxKm / 111;
        const latRad = (latUsuario * Math.PI) / 180;
        const deltaLng = distanciaMaxKm / (111 * Math.max(0.01, Math.cos(latRad)));

        const minLat = latUsuario - deltaLat;
        const maxLat = latUsuario + deltaLat;
        const minLng = lngUsuario - deltaLng;
        const maxLng = lngUsuario + deltaLng;

        const prediosCercanos = await prisma.$queryRaw<{ id: string; distancia_km: number }[]>`
          SELECT id, distancia_km
          FROM (
            SELECT id,
              ( 6371 * acos(
                  LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${latUsuario})) * cos(radians(latitud))
                    * cos(radians(longitud) - radians(${lngUsuario}))
                    + sin(radians(${latUsuario})) * sin(radians(latitud))
                  ))
              )) AS distancia_km
            FROM predios
            WHERE estado = 'activo'
              AND latitud BETWEEN ${minLat} AND ${maxLat}
              AND longitud BETWEEN ${minLng} AND ${maxLng}
          ) AS candidatos
          WHERE distancia_km <= ${distanciaMaxKm}
          ORDER BY distancia_km ASC
        `;
        return prediosCercanos.map((p) => p.id);
      }
      return undefined;
    })(),

    // B. Ciudad o dirección sin acentuación (busca tanto con acento como sin él)
    (async (): Promise<string[] | undefined> => {
      if (!ciudadLimpia) return undefined;
      try {
        const prediosMatching = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM predios
          WHERE estado = 'activo'
            AND unaccent(lower(direccion)) LIKE '%' || unaccent(lower(${ciudadLimpia})) || '%'
        `;
        return prediosMatching.map((p) => p.id);
      } catch (err) {
        // Fallback resiliente con normalizarTexto
        const ciudadNorm = normalizarTexto(ciudadLimpia);
        const predios = await prisma.predio.findMany({
          where: { estado: "activo" },
          select: { id: true, direccion: true },
        });
        return predios
          .filter((p) => normalizarTexto(p.direccion).includes(ciudadNorm))
          .map((p) => p.id);
      }
    })(),

    // C. Nombre de cancha o predio sin acentuación
    (async (): Promise<string[] | undefined> => {
      if (!nombreLimpio) return undefined;
      try {
        const canchasMatching = await prisma.$queryRaw<{ id: string }[]>`
          SELECT c.id
          FROM canchas c
          JOIN predios p ON c.predio_id = p.id
          WHERE p.estado = 'activo'
            AND (
              unaccent(lower(c.nombre)) LIKE '%' || unaccent(lower(${nombreLimpio})) || '%'
              OR unaccent(lower(p.nombre)) LIKE '%' || unaccent(lower(${nombreLimpio})) || '%'
            )
        `;
        return canchasMatching.map((c) => c.id);
      } catch (err) {
        // Fallback resiliente con normalizarTexto
        const nombreNorm = normalizarTexto(nombreLimpio);
        const canchas = await prisma.cancha.findMany({
          where: { predio: { estado: "activo" } },
          select: { id: true, nombre: true, predio: { select: { nombre: true } } },
        });
        return canchas
          .filter(
            (c) =>
              normalizarTexto(c.nombre).includes(nombreNorm) ||
              normalizarTexto(c.predio.nombre).includes(nombreNorm)
          )
          .map((c) => c.id);
      }
    })(),
  ]);

  // Si cualquiera de los filtros específicos no encontró resultados, retornamos vacío
  if (
    (prediosCercanosIds !== undefined && prediosCercanosIds.length === 0) ||
    (prediosPorCiudadIds !== undefined && prediosPorCiudadIds.length === 0) ||
    (canchasPorNombreIds !== undefined && canchasPorNombreIds.length === 0)
  ) {
    return [];
  }

  // Intersección de predios cuando aplican cercanía y ciudad
  let prediosIdsFinales: string[] | undefined;
  if (prediosCercanosIds && prediosPorCiudadIds) {
    const setCiudad = new Set(prediosPorCiudadIds);
    prediosIdsFinales = prediosCercanosIds.filter((id) => setCiudad.has(id));
    if (prediosIdsFinales.length === 0) return [];
  } else if (prediosCercanosIds) {
    prediosIdsFinales = prediosCercanosIds;
  } else if (prediosPorCiudadIds) {
    prediosIdsFinales = prediosPorCiudadIds;
  }

  // Día de la semana (0=Dom, 1=Lun...)
  const diaSemana = fecha ? fecha.getDay() : undefined;

  const canchas = await prisma.cancha.findMany({
    where: {
      ...(canchasOcupadasIds.length > 0 ? { id: { notIn: canchasOcupadasIds } } : {}),
      ...(canchasPorNombreIds ? { id: { in: canchasPorNombreIds } } : {}),
      predio: {
        estado: "activo",
        ...(prediosIdsFinales ? { id: { in: prediosIdsFinales } } : {}),
      },
      ...(diaSemana !== undefined ? { diasOperativos: { has: diaSemana } } : {}),
      ...(horaInicio ? { horarioApertura: { lte: horaInicio } } : {}),
      ...(horaFin ? { horarioCierre: { gte: horaFin } } : {}),
      ...(capacidad ? { capacidad } : {}),
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

