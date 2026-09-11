import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleDot, LogOut, ShieldCheck, UserCheck, LayoutDashboard } from "lucide-react";
import Image from "next/image";

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/empleado/turnero");
  }

  const rol = session.user.rol;
  if (!["empleado", "admin", "super_admin"].includes(rol)) {
    redirect("/");
  }

  const esAdmin = rol === "admin" || rol === "super_admin";

  return (
    <div className="min-h-screen bg-[#070b09] text-white flex flex-col font-sans">
      {/* Barra Superior */}
      <header className="sticky top-0 z-40 bg-[#0d1510]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-6">
          <Link href="/empleado/turnero" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
              <CircleDot className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-wider text-white uppercase">
              Picadito<span className="text-brand">Ya</span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/empleado/turnero"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand" />
              <span>Turnero</span>
            </Link>
            <Link
              href="/empleado/perfil"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <span>Mi Perfil</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {esAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline">Panel Admin</span>
            </Link>
          )}

          <Link
            href="/empleado/perfil"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Ver mi perfil"
          >
            <div className="w-6 h-6 rounded-lg bg-brand/20 text-brand font-black text-xs flex items-center justify-center uppercase">
              {session.user.name?.charAt(0) || "E"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white leading-tight">{session.user.name}</p>
              <p className="text-[10px] text-white/50 capitalize">{rol}</p>
            </div>
          </Link>

          <Link
            href="/api/auth/signout"
            className="p-2 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
