import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PredioDetalleClient from "@/components/predio/PredioDetalleClient";

export default async function PredioPaginaPublica({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const predio = await prisma.predio.findUnique({
    where: { id },
    include: {
      canchas: {
        orderBy: { nombre: "asc" },
      },
    },
  });

  if (!predio || predio.estado !== "activo") {
    notFound();
  }

  return <PredioDetalleClient predio={predio} />;
}
