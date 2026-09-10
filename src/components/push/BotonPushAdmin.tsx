"use client";

import { useState } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
} from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

interface BotonPushAdminProps {
  variante?: "header" | "card";
}

export default function BotonPushAdmin({ variante = "header" }: BotonPushAdminProps) {
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

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [probando, setProbando] = useState(false);
  const [pruebaExitosa, setPruebaExitosa] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleTest = async () => {
    setProbando(true);
    setPruebaExitosa(false);
    try {
      await sendTestNotification();
      setPruebaExitosa(true);
      setTimeout(() => setPruebaExitosa(false), 3000);
    } catch {
      // Handled by hook
    } finally {
      setProbando(false);
    }
  };

  // Modo Card (para dashboard o secciones completas)
  if (variante === "card") {
    return (
      <div className="bg-[#0f1712]/90 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isSubscribed
                ? "bg-brand/15 border border-brand/30 text-brand"
                : "bg-white/5 border border-white/10 text-white/60"
            }`}
          >
            {isSubscribed ? (
              <BellRing className="w-5 h-5 animate-bounce" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Alertas Push en Vivo</h4>
              {isSubscribed ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand/15 text-brand border border-brand/30">
                  Activas
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Inactivas
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Recibí avisos sonoros instantáneos en este dispositivo cuando entre una reserva o cancelación.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isSubscribed ? (
            <>
              <button
                onClick={handleTest}
                disabled={probando}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                title="Probar notificación en este navegador"
              >
                {probando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                ) : pruebaExitosa ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-brand" />
                )}
                <span>{pruebaExitosa ? "¡Enviada!" : "Probar"}</span>
              </button>
              <button
                onClick={() => unsubscribe()}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-300 flex items-center justify-center gap-1.5 transition-all"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>Desactivar</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => subscribe()}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-surface font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,228,148,0.3)] transition-all hover:scale-105"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-surface" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>Activar Notificaciones</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Modo Header (botón compacto con popover)
  return (
    <div className="relative">
      {isSubscribed ? (
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-brand/15 hover:bg-brand/25 border border-brand/30 text-xs font-black text-brand transition-all shadow-[0_0_10px_rgba(69,228,148,0.2)]"
          title="Notificaciones push activadas (click para opciones)"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Push Activo</span>
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        </button>
      ) : permission === "denied" ? (
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-300"
          title="Permiso de notificaciones bloqueado en tu navegador"
        >
          <BellOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Push Bloqueado</span>
        </div>
      ) : (
        <button
          onClick={() => subscribe()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-brand hover:text-surface hover:border-brand border border-white/10 text-xs font-bold text-white/90 transition-all group"
          title="Activar notificaciones en tiempo real en este navegador"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand group-hover:text-surface" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-brand group-hover:text-surface transition-colors" />
          )}
          <span className="hidden sm:inline">Activar Push</span>
        </button>
      )}

      {/* Popover de opciones para Push Activo */}
      {popoverOpen && isSubscribed && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPopoverOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-[#0f1712]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-brand" />
                <span className="text-xs font-black uppercase text-white">
                  Notificaciones Push
                </span>
              </div>
              <button
                onClick={() => setPopoverOpen(false)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed">
              Este navegador recibe alertas instantáneas cuando se agenda o cancela un turno.
            </p>

            {error && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                {error}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleTest}
                disabled={probando}
                className="w-full py-2 px-3 rounded-xl bg-brand/15 hover:bg-brand/25 border border-brand/30 text-brand text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {probando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : pruebaExitosa ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{pruebaExitosa ? "¡Notificación enviada!" : "Enviar Notificación de Prueba"}</span>
              </button>

              <button
                onClick={async () => {
                  await unsubscribe();
                  setPopoverOpen(false);
                }}
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
                <span>Desactivar en este dispositivo</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
