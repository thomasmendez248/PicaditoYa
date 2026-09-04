import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/AdminContext";
import AdminHeader from "@/components/admin/AdminHeader";
import { prisma } from "@/lib/prisma";
import { AlertTriangle } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  // Verificar si la suscripción está vencida o si la cuenta fue deshabilitada
  let membresiaExpirada = false;
  let cuentaDeshabilitada = false;

  if (session.user.rol === "admin") {
    const adminData = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        activo: true,
        fechaVencimientoSuscripcion: true,
        pagosAbono: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { fechaPago: true, createdAt: true, diasSumados: true },
        },
      },
    });

    if (adminData?.activo === false) {
      cuentaDeshabilitada = true;
    }

    let fechaVenc = adminData?.fechaVencimientoSuscripcion;
    const ultimoPago = adminData?.pagosAbono[0];

    // Sincronizar si la fecha del último pago fue editada en la base de datos
    if (ultimoPago && (ultimoPago.fechaPago || ultimoPago.createdAt)) {
      const basePago = new Date(ultimoPago.fechaPago || ultimoPago.createdAt);
      const dias = ultimoPago.diasSumados || 30;
      const vencPorPago = new Date(basePago.getTime() + dias * 24 * 60 * 60 * 1000);

      if (!fechaVenc || Math.abs(vencPorPago.getTime() - new Date(fechaVenc).getTime()) > 3600000) {
        fechaVenc = vencPorPago;
        await prisma.usuario.update({
          where: { id: session.user.id },
          data: { fechaVencimientoSuscripcion: vencPorPago },
        });
      }
    }

    const hoy = new Date();
    if (fechaVenc && new Date(fechaVenc) < hoy) {
      membresiaExpirada = true;
    }
    // Sincronizar estado de predios (vencimiento y límite de predios según plan)
    const { sincronizarEstadoPrediosAdmin } = await import("@/lib/membresias");
    await sincronizarEstadoPrediosAdmin(session.user.id);
  }

  return (
    <AdminProvider>
      <div className="min-h-screen bg-surface relative overflow-x-hidden flex flex-col font-sans text-text-main">
        {/* Ambient Stadium Glow Gradient */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/10 via-surface/40 to-surface -z-10" />
        <AdminHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8 animate-fade-in relative z-10">
          {cuentaDeshabilitada ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-wide mb-3">Cuenta Deshabilitada</h2>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                Tu cuenta de administrador ha sido deshabilitada por la administración de la plataforma. Tus complejos y canchas están fuera de servicio.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full text-left">
                <p className="text-sm font-bold text-white/50 uppercase tracking-wider mb-2">Para reactivar tu cuenta:</p>
                <p className="text-white text-base">Contactá a soporte técnico o a la administración de PicaditoYa.</p>
              </div>
            </div>
          ) : membresiaExpirada ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-wide mb-3">Membresía Expirada</h2>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                El acceso a la gestión de tu complejo deportivo ha sido bloqueado temporalmente por falta de pago. 
              </p>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full text-left">
                <p className="text-sm font-bold text-white/50 uppercase tracking-wider mb-2">Para reactivar tu cuenta:</p>
                <p className="text-white text-base">Contactá a soporte técnico o a tu representante comercial para registrar el pago de tu abono mensual.</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </AdminProvider>
  );
}
