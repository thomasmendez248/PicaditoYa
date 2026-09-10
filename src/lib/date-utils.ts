/**
 * Utilidades centralizadas para manejo de fechas y horarios en zona horaria Argentina (UTC-3 / America/Argentina/Buenos_Aires).
 * Garantiza consistencia en cualquier entorno de ejecución (localhost, Vercel UTC, Docker, etc.).
 */

export const ZONA_HORARIA_ARGENTINA = "America/Argentina/Buenos_Aires";

/**
 * Obtiene la fecha actual en formato "YYYY-MM-DD" según la hora de Argentina.
 */
export function getFechaHoyArgentina(): string {
  const ahoraArgentina = new Date(
    new Date().toLocaleString("en-US", { timeZone: ZONA_HORARIA_ARGENTINA })
  );
  const anio = ahoraArgentina.getFullYear();
  const mes = String(ahoraArgentina.getMonth() + 1).padStart(2, "0");
  const dia = String(ahoraArgentina.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Obtiene la hora actual en formato "HH:mm" según la hora de Argentina.
 */
export function getHoraActualArgentina(): string {
  const ahoraArgentina = new Date(
    new Date().toLocaleString("en-US", { timeZone: ZONA_HORARIA_ARGENTINA })
  );
  const hora = String(ahoraArgentina.getHours()).padStart(2, "0");
  const minutos = String(ahoraArgentina.getMinutes()).padStart(2, "0");
  return `${hora}:${minutos}`;
}

/**
 * Parsea una fecha (Date o string "YYYY-MM-DD") combinada con una hora "HH:mm"
 * como un instante exacto en la zona horaria de Argentina (UTC-3).
 *
 * Ejemplo: ("2026-09-10", "18:00") -> Date con offset -03:00.
 */
export function parseArgentinaDateTime(fecha: Date | string, hora: string): Date {
  const fechaIso = typeof fecha === "string" ? fecha.split("T")[0] : fecha.toISOString().split("T")[0];
  const [hh = "00", mm = "00"] = hora.split(":");
  const hhPad = hh.padStart(2, "0");
  const mmPad = mm.padStart(2, "0");

  // Offset Argentina: UTC-3 fijo
  return new Date(`${fechaIso}T${hhPad}:${mmPad}:00-03:00`);
}
