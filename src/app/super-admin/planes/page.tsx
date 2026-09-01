import { CreditCard, Construction } from "lucide-react";

export default function SuperAdminPlanesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center pt-16 lg:pt-0">
      <div className="w-20 h-20 rounded-3xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
        <CreditCard className="w-10 h-10 text-violet-400" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Construction className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-black uppercase tracking-widest text-violet-400">En construcción</span>
      </div>
      <h1 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-wide mb-4">
        Administración de Planes
      </h1>
      <p className="text-white/60 text-base max-w-md text-balance">
        Acá vas a poder definir y gestionar los planes disponibles para los complejos deportivos: precios, límites de canchas, períodos de facturación, etc.
      </p>
    </div>
  );
}
