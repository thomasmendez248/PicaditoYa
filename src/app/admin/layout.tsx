import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/AdminContext";
import AdminHeader from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || (session.user.rol !== "admin" && session.user.rol !== "super_admin")) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  return (
    <AdminProvider>
      <div className="min-h-screen bg-surface relative overflow-x-hidden flex flex-col font-sans text-text-main">
        {/* Ambient Stadium Glow Gradient */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/10 via-surface/40 to-surface -z-10" />
        <AdminHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in relative z-10">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
