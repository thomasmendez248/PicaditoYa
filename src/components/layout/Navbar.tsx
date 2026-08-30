import Link from "next/link";

export default function Navbar() {
  return (
    <header className="absolute top-0 left-0 right-0 w-full z-50 flex items-center justify-between px-6 py-6 bg-transparent border-b border-white/10">
      <Link href="/" className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-brand rounded-full outline-none">
        <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(69,228,148,0.4)] group-hover:scale-105 transition-transform">
          <span className="text-surface font-black text-xl italic tracking-tighter">P</span>
        </div>
        <span className="text-2xl font-bold text-white tracking-tight drop-shadow-sm group-hover:text-white/90 transition-colors">
          Picadito<span className="text-brand">Ya</span>
        </span>
      </Link>

      <nav className="flex items-center gap-6">
        <Link href="/registrar-cancha" className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors">
          Registra tu cancha
        </Link>
        <Link href="/auth/login" className="bg-brand hover:bg-brand-hover text-surface px-6 py-2.5 rounded-full font-bold transition-all hover:scale-105 shadow-[0_0_15px_rgba(69,228,148,0.3)] text-sm focus-visible:ring-2 focus-visible:ring-white outline-none">
          Acceder
        </Link>
      </nav>
    </header>
  );
}
