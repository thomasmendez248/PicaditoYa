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
      estado: "confirmado",
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
 */
export async function getCanchasDisponibles(
  fecha: Date,
  horaInicio: string,
  horaFin: string,
  nombre?: string
) {
  // Obtenemos todos los turnos confirmados que se solapan en ese horario
  const turnosOcupados = await prisma.turno.findMany({
    where: {
      fecha: { equals: fecha },
      estado: "confirmado",
      horaInicio: { lt: horaFin },
      horaFin: { gt: horaInicio },
    },
    select: { canchaId: true },
  });

  const canchasOcupadasIds = turnosOcupados.map((t) => t.canchaId);

  // Traemos las canchas que no están en esa lista de ocupadas,
  // cuyo predio esté activo, y que operen en ese día de la semana.
  const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado

  const canchas = await prisma.cancha.findMany({
    where: {
      id: { notIn: canchasOcupadasIds },
      predio: {
        estado: "activo",
      },
      diasOperativos: { has: diaSemana },
      horarioApertura: { lte: horaInicio },
      horarioCierre: { gte: horaFin },
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
        },
      },
    },
    orderBy: [{ predio: { nombre: "asc" } }, { nombre: "asc" }],
  });

  return canchas;
}
