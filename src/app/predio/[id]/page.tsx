export default function PredioPaginaPublica({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Predio #{params.id}</h1>
      <p>Detalle del predio con sus canchas y disponibilidad — próximamente.</p>
    </div>
  );
}
