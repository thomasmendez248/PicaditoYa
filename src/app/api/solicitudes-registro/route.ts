import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const solicitudSchema = z.object({
  predio: z.string().trim().min(2, "El nombre del predio debe tener al menos 2 caracteres"),
  encargado: z.string().trim().min(2, "El nombre del encargado debe tener al menos 2 caracteres"),
  telefono: z.string().trim().min(6, "Ingresá un teléfono válido"),
  email: z.string().trim().email("Ingresá un correo electrónico válido"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = solicitudSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues?.[0]?.message || "Datos inválidos";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { predio, encargado, telefono, email } = result.data;

    // Verificar si ya existe una solicitud pendiente reciente con ese email
    const existente = await prisma.solicitudRegistro.findFirst({
      where: {
        email: email.toLowerCase(),
        estado: "pendiente",
      },
    });

    if (existente) {
      return NextResponse.json(
        {
          error: "Ya tenemos una solicitud pendiente registrada con este correo. Nos pondremos en contacto a la brevedad.",
        },
        { status: 409 }
      );
    }

    const solicitud = await prisma.solicitudRegistro.create({
      data: {
        nombrePredio: predio,
        nombreContacto: encargado,
        telefono,
        email: email.toLowerCase(),
        estado: "pendiente",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        mensaje: "Solicitud registrada con éxito",
        id: solicitud.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/solicitudes-registro]", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud. Intenta nuevamente más tarde." },
      { status: 500 }
    );
  }
}
