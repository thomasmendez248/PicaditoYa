import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  const turnos = await prisma.turno.findMany({
    where: {
      canchaId,
      fecha: {
        equals: fecha,
      },
      estado: { in: ["confirmado", "pendiente"] as any },
      ...(excludeTurnoId ? { id: { not: excludeTurnoId } } : {}),
    },
    select: {
      id: true,
      horaInicio: true,
      horaFin: true,
    },
  });

  const [hIni, mIni] = horaInicio.split(":").map(Number);
  const [hFin, mFin] = horaFin.split(":").map(Number);
  const reqInicio = hIni * 60 + mIni;
  let reqFin = hFin * 60 + mFin;
  if (reqFin <= reqInicio) reqFin += 24 * 60;

  for (const t of turnos) {
    const [tHIni, tMIni] = t.horaInicio.split(":").map(Number);
    const [tHFin, tMFin] = t.horaFin.split(":").map(Number);
    const tInicio = tHIni * 60 + tMIni;
    let tFin = tHFin * 60 + tMFin;
    if (tFin <= tInicio) tFin += 24 * 60;

    // Dos intervalos se solapan si reqInicio < tFin AND reqFin > tInicio
    if (reqInicio < tFin && reqFin > tInicio) {
      return false;
    }
  }

  return true;
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
  capacidad?: number,
  provincia?: string
) {
  const ciudadLimpia = ciudad?.trim() || "";
  const provinciaLimpia = provincia?.trim() || "";
  const nombreLimpio = nombre?.trim() || "";

  // 1. Si se proveyó horario y fecha, buscamos turnos ocupados
  let canchasOcupadasIds: string[] = [];
  if (fecha && horaInicio && horaFin) {
    const turnosFecha = await prisma.turno.findMany({
      where: {
        fecha: { equals: fecha },
        estado: { in: ["confirmado", "pendiente"] as any },
      },
      select: { canchaId: true, horaInicio: true, horaFin: true },
    });

    const [hIni, mIni] = horaInicio.split(":").map(Number);
    const [hFin, mFin] = horaFin.split(":").map(Number);
    const reqIniMin = hIni * 60 + mIni;
    let reqFinMin = hFin * 60 + mFin;
    if (reqFinMin <= reqIniMin) reqFinMin += 24 * 60;

    canchasOcupadasIds = turnosFecha
      .filter((t) => {
        const [tHI, tMI] = t.horaInicio.split(":").map(Number);
        const [tHF, tMF] = t.horaFin.split(":").map(Number);
        const tIni = tHI * 60 + tMI;
        let tFin = tHF * 60 + tMF;
        if (tFin <= tIni) tFin += 24 * 60;
        return reqIniMin < tFin && reqFinMin > tIni;
      })
      .map((t) => t.canchaId);
  }

  // 2. Filtros avanzados concurrentes (cercanía geoespacial, ciudad sin acentos, nombre sin acentos, provincia sin acentos)
  const [prediosCercanosIds, prediosPorCiudadIds, canchasPorNombreIds, prediosPorProvinciaIds] = await Promise.all([
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
            SELECT p.id,
              ( 6371 * acos(
                  LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${latUsuario})) * cos(radians(p.latitud))
                    * cos(radians(p.longitud) - radians(${lngUsuario}))
                    + sin(radians(${latUsuario})) * sin(radians(p.latitud))
                  ))
              )) AS distancia_km
            FROM predios p
            JOIN usuarios u ON p.admin_id = u.id
            WHERE p.estado = 'activo'
              AND u.activo IS TRUE
              AND u.fecha_vencimiento_suscripcion IS NOT NULL
              AND u.fecha_vencimiento_suscripcion >= NOW()
              AND p.latitud BETWEEN ${minLat} AND ${maxLat}
              AND p.longitud BETWEEN ${minLng} AND ${maxLng}
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
          SELECT p.id FROM predios p
          JOIN usuarios u ON p.admin_id = u.id
          WHERE p.estado = 'activo'
            AND u.activo IS TRUE
            AND u.fecha_vencimiento_suscripcion IS NOT NULL
            AND u.fecha_vencimiento_suscripcion >= NOW()
            AND unaccent(lower(p.direccion)) LIKE '%' || unaccent(lower(${ciudadLimpia})) || '%'
        `;
        return prediosMatching.map((p) => p.id);
      } catch (err) {
        // Fallback resiliente con normalizarTexto
        const ciudadNorm = normalizarTexto(ciudadLimpia);
        const predios = await prisma.predio.findMany({
          where: {
            estado: "activo",
            admin: { activo: true, fechaVencimientoSuscripcion: { gte: new Date() } },
          },
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
          JOIN usuarios u ON p.admin_id = u.id
          WHERE p.estado = 'activo'
            AND u.activo IS TRUE
            AND u.fecha_vencimiento_suscripcion IS NOT NULL
            AND u.fecha_vencimiento_suscripcion >= NOW()
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
          where: {
            predio: {
              estado: "activo",
              admin: { activo: true, fechaVencimientoSuscripcion: { gte: new Date() } },
            },
          },
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

    // D. Provincia sin acentuación (busca en la dirección del predio)
    (async (): Promise<string[] | undefined> => {
      if (!provinciaLimpia) return undefined;
      try {
        const prediosMatching = await prisma.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM predios p
          JOIN usuarios u ON p.admin_id = u.id
          WHERE p.estado = 'activo'
            AND u.activo IS TRUE
            AND u.fecha_vencimiento_suscripcion IS NOT NULL
            AND u.fecha_vencimiento_suscripcion >= NOW()
            AND unaccent(lower(p.direccion)) LIKE '%' || unaccent(lower(${provinciaLimpia})) || '%'
        `;
        return prediosMatching.map((p) => p.id);
      } catch (err) {
        const provNorm = normalizarTexto(provinciaLimpia);
        const predios = await prisma.predio.findMany({
          where: {
            estado: "activo",
            admin: { activo: true, fechaVencimientoSuscripcion: { gte: new Date() } },
          },
          select: { id: true, direccion: true },
        });
        return predios
          .filter((p) => normalizarTexto(p.direccion).includes(provNorm))
          .map((p) => p.id);
      }
    })(),
  ]);

  // Si cualquiera de los filtros específicos no encontró resultados, retornamos vacío
  if (
    (prediosCercanosIds !== undefined && prediosCercanosIds.length === 0) ||
    (prediosPorCiudadIds !== undefined && prediosPorCiudadIds.length === 0) ||
    (prediosPorProvinciaIds !== undefined && prediosPorProvinciaIds.length === 0) ||
    (canchasPorNombreIds !== undefined && canchasPorNombreIds.length === 0)
  ) {
    return [];
  }

  // Intersección de predios cuando aplican cercanía, ciudad y/o provincia
  let prediosIdsFinales: string[] | undefined;
  const filtrosPredios = [prediosCercanosIds, prediosPorCiudadIds, prediosPorProvinciaIds].filter(
    (arr): arr is string[] => arr !== undefined
  );

  if (filtrosPredios.length > 0) {
    prediosIdsFinales = filtrosPredios.reduce((acc, curr) => {
      const setCurr = new Set(curr);
      return acc.filter((id) => setCurr.has(id));
    });
    if (prediosIdsFinales.length === 0) return [];
  }

  // Día de la semana (0=Dom, 1=Lun...)
  const diaSemana = fecha ? fecha.getDay() : undefined;
  const ahora = new Date();

  const canchas = await prisma.cancha.findMany({
    where: {
      ...(canchasOcupadasIds.length > 0 ? { id: { notIn: canchasOcupadasIds } } : {}),
      ...(canchasPorNombreIds ? { id: { in: canchasPorNombreIds } } : {}),
      predio: {
        estado: "activo",
        admin: {
          activo: true,
          fechaVencimientoSuscripcion: {
            gte: ahora,
          },
        },
        ...(prediosIdsFinales ? { id: { in: prediosIdsFinales } } : {}),
      },
      ...(diaSemana !== undefined ? { diasOperativos: { has: diaSemana } } : {}),
      ...(horaInicio ? { horarioApertura: { lte: horaInicio } } : {}),
      ...(horaFin
        ? horaFin === "00:00"
          ? { horarioCierre: { in: ["00:00", "23:59", "24:00"] } }
          : {
              OR: [
                { horarioCierre: { gte: horaFin } },
                { horarioCierre: { in: ["00:00", "23:59", "24:00"] } },
              ],
            }
        : {}),
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

  if (canchas.length === 0) return [];

  const predioIds = Array.from(new Set(canchas.map((c) => c.predio.id)));
  const fotosRaw = await prisma.$queryRaw<{ id: string; imagen_url: string | null }[]>`
    SELECT id, imagen_url FROM predios WHERE id IN (${Prisma.join(predioIds)})
  `;
  const fotosMap = new Map(fotosRaw.map((f) => [f.id, f.imagen_url]));

  return canchas.map((cancha) => ({
    ...cancha,
    predio: {
      ...cancha.predio,
      imagenUrl: fotosMap.get(cancha.predio.id) ?? null,
    },
  }));
}

