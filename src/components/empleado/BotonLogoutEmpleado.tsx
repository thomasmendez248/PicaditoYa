"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function BotonLogoutEmpleado() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="p-2 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
