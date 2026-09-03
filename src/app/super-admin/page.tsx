import { LayoutDashboard, Construction } from "lucide-react";

export default function SuperAdminDashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] text-center px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-5 sm:mb-6 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
        <LayoutDashboard className="w-8 h-8 sm:w-10 sm:h-10 text-violet-400" />
      </div>
      <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
        <Construction className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-black uppercase tracking-widest text-violet-400">En construcción</span>
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-wide mb-3 sm:mb-4">
        Dashboard Global
      </h1>
      <p className="text-white/60 text-sm sm:text-base max-w-md text-balance">
        Acá vas a poder ver estadísticas globales de toda la plataforma: admins activos, ingresos totales, predios registrados y más.
      </p>
    </div>
  );
}
