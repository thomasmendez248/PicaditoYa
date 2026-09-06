"use client";

/**
 * PushNotificationsSection — Sección de gestión de notificaciones Push
 *
 * Muestra el estado actual de las notificaciones y permite al usuario
 * activarlas, desactivarlas y enviar una notificación de prueba.
 *
 * Maneja correctamente los 3 estados del permiso del navegador:
 *   - "default": El usuario todavía no decidió
 *   - "granted": El usuario permitió notificaciones
 *   - "denied": El usuario bloqueó las notificaciones
 *   - "unsupported": El navegador no soporta Web Push
 */

import { Bell, BellOff, BellRing, AlertCircle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

export default function PushNotificationsSection() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  // ─────────────────────────────────────────────
  // RENDERIZADO CONDICIONAL POR ESTADO
  // ─────────────────────────────────────────────

  const renderContent = () => {
    // Cargando estado inicial
    if (isLoading && permission === "default" && !isSubscribed) {
      return (
        <div className="flex items-center gap-3 text-white/50">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span className="text-sm">Verificando estado de notificaciones...</span>
        </div>
      );
    }

    // Navegador no compatible
    if (!isSupported || permission === "unsupported") {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Navegador no compatible
              </p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Tu navegador no soporta notificaciones Push. Para activarlas, usá Chrome, Edge o Firefox en su versión más reciente.
              </p>
              <p className="text-xs text-white/50 mt-1">
                En iPhone/iPad: actualizá a iOS 16.4+ y usá Safari.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Permisos bloqueados
    if (permission === "denied") {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <BellOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">
                Notificaciones bloqueadas
              </p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Bloqueaste las notificaciones en tu navegador. Para activarlas nuevamente:
              </p>
              <ol className="text-xs text-white/50 mt-2 space-y-1 list-decimal list-inside">
                <li>Hacé clic en el candado 🔒 en la barra de dirección</li>
                <li>Buscá &quot;Notificaciones&quot; y cambiá a &quot;Permitir&quot;</li>
                <li>Recargá la página</li>
              </ol>
            </div>
          </div>
          <a
            href="https://support.google.com/chrome/answer/3220216"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover transition-colors font-semibold"
          >
            <ExternalLink className="w-3 h-3" />
            Ver instrucciones para Chrome
          </a>
        </div>
      );
    }

    // Activo y suscripto
    if (permission === "granted" && isSubscribed) {
      return (
        <div className="space-y-4">
          {/* Badge de estado activo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/30">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Notificaciones activadas
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
            </div>
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            Recibirás avisos importantes aunque no tengas la página abierta, incluso con el navegador minimizado.
          </p>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Botón de prueba */}
            <button
              id="push-test-btn"
              onClick={sendTestNotification}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand/30 text-white font-bold text-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4 text-brand" />
                  <span>Enviar notificación de prueba</span>
                </>
              )}
            </button>

            {/* Botón de desactivar */}
            <button
              id="push-unsubscribe-btn"
              onClick={unsubscribe}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-300 font-bold text-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Desactivando...</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>Desactivar notificaciones</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    // Estado por defecto: el usuario todavía no decidió (o ya dió permiso pero no está suscripto)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
              Notificaciones desactivadas
            </span>
          </div>
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          Activá las notificaciones para recibir avisos de reservas, cancelaciones y recordatorios aunque no tengas la página abierta.
        </p>

        <button
          id="push-subscribe-btn"
          onClick={subscribe}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-surface font-black text-sm transition-all shadow-[0_0_20px_rgba(76,175,125,0.3)] hover:scale-105"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Activando...</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Activar notificaciones</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-[#0f1712]/90 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-black text-white uppercase tracking-wide flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand" />
          Notificaciones
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Recibí avisos importantes aunque no tengas la página abierta.
        </p>
      </div>

      {/* Contenido principal */}
      {renderContent()}

      {/* Mensaje de error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Error</p>
            <p className="text-xs text-white/60 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Nota de compatibilidad */}
      {isSupported && permission !== "unsupported" && (
        <p className="text-[11px] text-white/30 leading-relaxed border-t border-white/5 pt-4">
          Las notificaciones Push funcionan en Chrome, Edge y Firefox (Windows, macOS, Android). En iPhone/iPad requieren Safari iOS 16.4+ o superior.
        </p>
      )}
    </div>
  );
}
