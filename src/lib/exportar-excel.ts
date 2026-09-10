import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface TurnoParaExcel {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  precioAlMomentoReserva: number;
  esFijo?: boolean;
  grupoFijoId?: string | null;
  nombreClienteManual?: string | null;
  telefonoClienteManual?: string | null;
  cancha?: {
    nombre: string;
    deporte?: string;
    predio?: {
      nombre: string;
    };
  };
  cliente?: {
    nombre: string;
    apellido?: string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
}

export function exportarTurnosAExcel(
  turnos: TurnoParaExcel[],
  nombreArchivo: string = "Reporte_Turnos_PicaditoYa"
) {
  if (!turnos || turnos.length === 0) {
    alert("No hay turnos para exportar con los filtros actuales.");
    return;
  }

  // 1. Mapear datos detallados para la Hoja 1: "Turnos"
  const filasTurnos = turnos.map((t) => {
    let fechaStr = t.fecha;
    try {
      const d = new Date(t.fecha);
      if (!isNaN(d.getTime())) {
        fechaStr = format(d, "dd/MM/yyyy", { locale: es });
      }
    } catch {
      fechaStr = t.fecha.split("T")[0];
    }

    const clienteNombre = t.cliente
      ? [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" ")
      : t.nombreClienteManual || "Cliente sin registrar";

    const clienteContacto =
      t.cliente?.telefono || t.telefonoClienteManual || "-";

    const clienteEmail = t.cliente?.email || "-";
    const tipoCliente = t.cliente ? "Usuario Registrado" : "Manual / Mostrador";

    let estadoLegible = t.estado;
    switch (t.estado) {
      case "confirmado":
        estadoLegible = "Confirmado";
        break;
      case "pendiente":
        estadoLegible = "Pendiente de Aprobación";
        break;
      case "completado":
        estadoLegible = "Jugado (Completado)";
        break;
      case "cancelado_a_tiempo":
        estadoLegible = "Cancelado a Tiempo";
        break;
      case "cancelado_tarde":
        estadoLegible = "Cancelado Tarde";
        break;
      case "no_show":
        estadoLegible = "No Asistió (No-Show)";
        break;
    }

    return {
      "ID Turno": t.id,
      Fecha: fechaStr,
      "Horario Inicio": t.horaInicio,
      "Horario Fin": t.horaFin,
      Cancha: t.cancha?.nombre || "-",
      Deporte: t.cancha?.deporte || "Fútbol",
      "Tipo Reserva": t.esFijo ? "Fijo Semanal" : "Estándar",
      Cliente: clienteNombre,
      Teléfono: clienteContacto,
      Email: clienteEmail,
      "Tipo Registro": tipoCliente,
      "Monto ($)": t.precioAlMomentoReserva,
      Estado: estadoLegible,
    };
  });

  // 2. Mapear métricas de resumen para la Hoja 2: "Resumen de Caja"
  const totalTurnos = turnos.length;
  const turnosConfirmados = turnos.filter((t) => t.estado === "confirmado").length;
  const turnosCompletados = turnos.filter((t) => t.estado === "completado").length;
  const turnosPendientes = turnos.filter((t) => t.estado === "pendiente").length;
  const turnosCancelados = turnos.filter(
    (t) => t.estado === "cancelado_a_tiempo" || t.estado === "cancelado_tarde"
  ).length;
  const turnosNoShow = turnos.filter((t) => t.estado === "no_show").length;
  const turnosFijos = turnos.filter((t) => t.esFijo).length;

  const ingresosRealizados = turnos
    .filter((t) => t.estado === "confirmado" || t.estado === "completado")
    .reduce((sum, t) => sum + t.precioAlMomentoReserva, 0);

  const ingresosPerdidosCancelacion = turnos
    .filter((t) => t.estado === "cancelado_a_tiempo" || t.estado === "cancelado_tarde" || t.estado === "no_show")
    .reduce((sum, t) => sum + t.precioAlMomentoReserva, 0);

  // Desglose por cancha
  const canchasMap: Record<
    string,
    { nombre: string; deporte: string; cantidad: number; total: number }
  > = {};

  turnos.forEach((t) => {
    const cNombre = t.cancha?.nombre || "Sin Cancha";
    const deporte = t.cancha?.deporte || "General";
    if (!canchasMap[cNombre]) {
      canchasMap[cNombre] = {
        nombre: cNombre,
        deporte,
        cantidad: 0,
        total: 0,
      };
    }
    canchasMap[cNombre].cantidad += 1;
    if (t.estado === "confirmado" || t.estado === "completado") {
      canchasMap[cNombre].total += t.precioAlMomentoReserva;
    }
  });

  const filasResumenGeneral = [
    { Métrica: "Fecha de Exportación", Valor: format(new Date(), "dd/MM/yyyy HH:mm") },
    { Métrica: "Total de Turnos Registrados", Valor: totalTurnos },
    { Métrica: "Turnos Confirmados", Valor: turnosConfirmados },
    { Métrica: "Turnos Jugados (Completados)", Valor: turnosCompletados },
    { Métrica: "Turnos Pendientes de Aprobación", Valor: turnosPendientes },
    { Métrica: "Turnos Cancelados", Valor: turnosCancelados },
    { Métrica: "Turnos Ausentes (No-Show)", Valor: turnosNoShow },
    { Métrica: "Turnos Fijos Semanales", Valor: turnosFijos },
    { Métrica: "Total Caja / Recaudado ($)", Valor: ingresosRealizados },
    { Métrica: "Monto No Percibido por Cancelaciones / No-Show ($)", Valor: ingresosPerdidosCancelacion },
  ];

  const filasPorCancha = Object.values(canchasMap).map((c) => ({
    Cancha: c.nombre,
    Deporte: c.deporte,
    "Turnos Totales": c.cantidad,
    "Recaudación Efectiva ($)": c.total,
  }));

  // Crear Workbook
  const wb = XLSX.utils.book_new();

  // Hoja 1: Turnos detallados
  const wsTurnos = XLSX.utils.json_to_sheet(filasTurnos);
  wsTurnos["!cols"] = [
    { wch: 18 }, // ID
    { wch: 14 }, // Fecha
    { wch: 14 }, // Inicio
    { wch: 14 }, // Fin
    { wch: 22 }, // Cancha
    { wch: 14 }, // Deporte
    { wch: 16 }, // Tipo Reserva
    { wch: 26 }, // Cliente
    { wch: 18 }, // Teléfono
    { wch: 26 }, // Email
    { wch: 18 }, // Tipo Registro
    { wch: 12 }, // Monto
    { wch: 24 }, // Estado
  ];
  XLSX.utils.book_append_sheet(wb, wsTurnos, "Turnos y Reservas");

  // Hoja 2: Resumen de Caja
  const wsResumen = XLSX.utils.json_to_sheet(filasResumenGeneral);
  wsResumen["!cols"] = [{ wch: 38 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen de Caja");

  // Hoja 3: Por Cancha
  if (filasPorCancha.length > 0) {
    const wsCanchas = XLSX.utils.json_to_sheet(filasPorCancha);
    wsCanchas["!cols"] = [
      { wch: 25 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCanchas, "Por Cancha");
  }

  // Generar archivo y descargar
  const fechaHoy = format(new Date(), "yyyy-MM-dd");
  XLSX.writeFile(wb, `${nombreArchivo}_${fechaHoy}.xlsx`);
}
