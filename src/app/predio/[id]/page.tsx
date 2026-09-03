import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PredioDetalleClient from "@/components/predio/PredioDetalleClient";

export default async function PredioPaginaPublica({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [predio, fotoRaw] = await Promise.all([
    prisma.predio.findUnique({
      where: { id },
      include: {
        canchas: {
          orderBy: { nombre: "asc" },
        },
      },
    }),
    prisma.$queryRaw<{ imagen_url: string | null }[]>`
      SELECT imagen_url FROM predios WHERE id = ${id} LIMIT 1
    `,
  ]);

  if (!predio || predio.estado !== "activo") {
    notFound();
  }

  const predioConFoto = {
    ...predio,
    imagenUrl: fotoRaw[0]?.imagen_url || null,
  };

  return <PredioDetalleClient predio={predioConFoto} />;
}
