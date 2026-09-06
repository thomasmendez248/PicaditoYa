"use client";

/**
 * usePushNotifications — Hook para gestionar Web Push Notifications
 *
 * Uso:
 *   const { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
 *
 * NO solicita permiso automáticamente. Solo suscribe cuando el usuario llama a subscribe() explícitamente.
 */

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushNotificationsReturn {
  /** Si el navegador soporta Web Push (Notification + ServiceWorker + PushManager) */
  isSupported: boolean;
  /** Estado del permiso de notificaciones */
  permission: PushPermission;
  /** Si el usuario está actualmente suscrito */
  isSubscribed: boolean;
  /** Si hay una operación en curso */
  isLoading: boolean;
  /** Mensaje de error, null si no hay error */
  error: string | null;
  /** Suscribir al usuario a notificaciones Push */
  subscribe: () => Promise<void>;
  /** Desuscribir al usuario de notificaciones Push */
  unsubscribe: () => Promise<void>;
  /** Enviar una notificación de prueba al usuario actual */
  sendTestNotification: () => Promise<void>;
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

/**
 * Convierte una base64url string (VAPID) a Uint8Array para PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica si el navegador soporta Web Push Notifications
 */
function checkSupport(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Registra (o reutiliza) el Service Worker de Push
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  // Verificar si ya hay un SW registrado para sw.js
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) {
    return existing;
  }

  // Registrar el Service Worker por primera vez
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });

  // Esperar a que esté activo
  if (registration.installing) {
    await new Promise<void>((resolve, reject) => {
      const sw = registration.installing!;
      sw.addEventListener("statechange", () => {
        if (sw.state === "activated") resolve();
        if (sw.state === "redundant") reject(new Error("Service Worker se volvió redundante"));
      });
    });
  }

  return registration;
}

// ─────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true al inicio mientras carga el estado inicial
  const [error, setError] = useState<string | null>(null);

  // ─── Inicialización: verificar soporte y estado actual ───
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      const supported = checkSupport();
      setIsSupported(supported);

      if (!supported) {
        setPermission("unsupported");
        setIsLoading(false);
        return;
      }

      // Leer el estado actual del permiso
      const currentPermission = Notification.permission as PushPermission;
      setPermission(currentPermission);

      if (currentPermission === "granted") {
        // Verificar si hay una suscripción activa
        try {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
          }
        } catch (err) {
          console.error("[usePushNotifications] Error al verificar suscripción:", err);
        }
      }

      setIsLoading(false);
    }

    initialize();
  }, []);

  // ─── subscribe() ───
  const subscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      setError("Tu navegador no soporta notificaciones Push. Intentá con Chrome o Firefox.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError("La configuración de notificaciones no está completa. Contactá al soporte.");
      console.error("[usePushNotifications] NEXT_PUBLIC_VAPID_PUBLIC_KEY no está definida");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Solicitar permiso (solo si no fue concedido previamente)
      let currentPermission = Notification.permission;

      if (currentPermission === "denied") {
        setPermission("denied");
        setError(
          "Las notificaciones están bloqueadas en tu navegador. Para activarlas, hacé clic en el candado en la barra de dirección y permití las notificaciones."
        );
        return;
      }

      if (currentPermission !== "granted") {
        const result = await Notification.requestPermission();
        currentPermission = result;
        setPermission(result as PushPermission);

        if (result !== "granted") {
          setError("No se concedió el permiso para notificaciones.");
          return;
        }
      }

      // 2. Obtener/registrar el Service Worker
      const registration = await getServiceWorkerRegistration();

      // 3. Verificar si ya existe una suscripción activa
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 4. Crear nueva suscripción con la VAPID public key
        const applicationServerKeyBytes = urlBase64ToUint8Array(vapidPublicKey);
        // Usamos .buffer directamente para evitar el type mismatch con SharedArrayBuffer
        const applicationServerKey = applicationServerKeyBytes.buffer.slice(
          applicationServerKeyBytes.byteOffset,
          applicationServerKeyBytes.byteOffset + applicationServerKeyBytes.byteLength
        ) as ArrayBuffer;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 5. Extraer las claves de la suscripción
      const key = subscription.getKey("p256dh");
      const token = subscription.getKey("auth");

      if (!key || !token) {
        throw new Error("No se pudieron obtener las claves de la suscripción Push.");
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(token)));

      // 6. Guardar la suscripción en el backend (validado por NextAuth)
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error("Tu sesión expiró. Iniciá sesión nuevamente.");
        }
        throw new Error(data.error || "Error al guardar la suscripción en el servidor.");
      }

      setIsSubscribed(true);
      console.log("[usePushNotifications] Suscripción guardada correctamente");
    } catch (err: unknown) {
      console.error("[usePushNotifications] Error en subscribe():", err);
      if (err instanceof Error) {
        // Detectar errores conocidos
        if (err.name === "NotAllowedError") {
          setPermission("denied");
          setError("El permiso fue denegado. Habilitá las notificaciones desde la configuración de tu navegador.");
        } else if (err.message.includes("VAPID")) {
          setError("Error de configuración del servidor. Contactá al soporte.");
        } else if (err.message.includes("Network") || err.message.includes("Failed to fetch")) {
          setError("Error de conexión. Verificá tu internet e intentá nuevamente.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Ocurrió un error inesperado al activar las notificaciones.");
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // ─── unsubscribe() ───
  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // 1. Obtener la suscripción actual del navegador
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      // 2. Eliminar del backend (incluso si no hay suscripción local)
      const endpoint = subscription?.endpoint;
      if (endpoint) {
        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });

        if (!response.ok && response.status !== 404) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Error al eliminar la suscripción del servidor.");
        }
      }

      // 3. Desuscribir del navegador
      if (subscription) {
        await subscription.unsubscribe();
        console.log("[usePushNotifications] Desuscripción completada en el navegador");
      }

      setIsSubscribed(false);
    } catch (err: unknown) {
      console.error("[usePushNotifications] Error en unsubscribe():", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al desactivar las notificaciones.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── sendTestNotification() ───
  const sendTestNotification = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error("Tu sesión expiró. Iniciá sesión nuevamente.");
        }
        throw new Error(data.error || "Error al enviar la notificación de prueba.");
      }

      console.log("[usePushNotifications] Notificación de prueba enviada");
    } catch (err: unknown) {
      console.error("[usePushNotifications] Error en sendTestNotification():", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al enviar la notificación de prueba.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
