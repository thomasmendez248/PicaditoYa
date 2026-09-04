import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.rol !== "super_admin") {
    redirect("/auth/login?callbackUrl=/super-admin");
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-text-main flex overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-900/20 via-surface/60 to-surface -z-10" />

      {/* Sidebar */}
      <SuperAdminSidebar />

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col overflow-x-hidden">
        <div className="flex-1 px-4 sm:px-6 lg:px-10 pt-20 lg:pt-8 pb-12 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
