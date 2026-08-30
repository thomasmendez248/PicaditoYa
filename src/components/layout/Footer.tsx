import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0d130e] border-t border-white/5 py-12 px-6 md:px-16 lg:px-24 text-white/70">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        {/* Marca y Descripción */}
        <div className="flex flex-col gap-4 md:max-w-sm">
          <Link href="/" className="flex items-center gap-2 group outline-none w-fit">
            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(69,228,148,0.3)]">
              <span className="text-surface font-black text-lg italic tracking-tighter">P</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
              Picadito<span className="text-brand">Ya</span>
            </span>
          </Link>
          <p className="text-sm text-white/50 text-balance">
            La plataforma en Argentina para gestionar y reservar turnos en predios deportivos. Armá el partido y andá directo a la cancha.
          </p>
        </div>

        {/* Contacto Directo */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-semibold text-lg">Contacto Administradores</h3>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand" />
              <span>351-513-8542</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand" />
              <span>3572-66-7390</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand" />
              <span>contacto@picaditoya.app</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand" />
              <span>Córdoba, Argentina</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <p>© {new Date().getFullYear()} PicaditoYa. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-white transition-colors">Términos y Condiciones</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacidad</Link>
        </div>
      </div>
    </footer>
  );
}
