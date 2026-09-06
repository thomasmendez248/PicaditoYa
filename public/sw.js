/**
 * PicaditoYa — Service Worker para Web Push Notifications
 *
 * IMPORTANTE: Este Service Worker existe ÚNICAMENTE para recibir notificaciones Push.
 * No implementa ninguna funcionalidad PWA (sin cache, sin offline, sin precache).
 *
 * Soporte de plataformas:
 * - Chrome/Edge (Android + Windows/macOS): Funciona completamente
 * - Firefox (Windows/macOS): Funciona completamente
 * - Safari macOS 16.1+: Funciona (requiere permiso explícito)
 * - Safari iOS 16.4+: Funciona en modo standalone o con permiso explícito
 *
 * Formato del payload esperado:
 * {
 *   "title": "Título de la notificación",
 *   "body": "Texto del cuerpo",
 *   "icon": "/icon-192.png",  // opcional
 *   "badge": "/badge.png",    // opcional
 *   "url": "/ruta-destino",   // opcional, default "/"
 *   "data": { ... }           // opcional, datos adicionales
 * }
 */

"use strict";

// ─────────────────────────────────────────────
// INSTALL — Activar inmediatamente (sin esperar a que las pestañas se cierren)
// ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Service Worker de Push Notifications");
  // Activar inmediatamente sin esperar que las pestañas anteriores se cierren
  event.waitUntil(self.skipWaiting());
});

// ─────────────────────────────────────────────
// ACTIVATE — Tomar el control de los clientes existentes
// ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker de Push Notifications activado");
  event.waitUntil(self.clients.claim());
});

// ─────────────────────────────────────────────
// PUSH — Recibir notificaciones del servidor
// ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.warn("[SW] Push recibido sin datos");
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    console.error("[SW] Error al parsear payload del Push:", err);
    // Intentar como texto plano
    const text = event.data.text();
    payload = {
      title: "PicaditoYa",
      body: text || "Nueva notificación",
      url: "/",
    };
  }

  const {
    title = "PicaditoYa",
    body = "Tenés una nueva notificación",
    icon = "/favicon.ico",
    badge = "/favicon.ico",
    url = "/",
    data = {},
    tag,
    requireInteraction = false,
  } = payload;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag: tag || `picaditoya-${Date.now()}`,
    requireInteraction,
    data: {
      ...data,
      url, // Guardamos la URL en data para usarla en notificationclick
    },
    // Vibración en dispositivos móviles compatibles (ignorada donde no se soporta)
    vibrate: [200, 100, 200],
    // Acciones (solo se muestran en Chrome/Android)
    actions: url && url !== "/"
      ? [{ action: "open", title: "Ver detalles" }]
      : [],
  };

  console.log("[SW] Mostrando notificación:", title, body);

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// ─────────────────────────────────────────────
// NOTIFICATIONCLICK — Manejar click en la notificación
// ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Obtener la URL de destino del payload
  const targetUrl = event.notification.data?.url || "/";
  const origin = self.location.origin;
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : `${origin}${targetUrl}`;

  console.log("[SW] Click en notificación, navegando a:", fullUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una pestaña de la aplicación abierta
        const matchingClient = clientList.find((client) => {
          const clientUrl = new URL(client.url);
          return clientUrl.origin === origin;
        });

        if (matchingClient) {
          // Si existe una pestaña, enfocarla y navegar a la URL
          console.log("[SW] Enfocando pestaña existente:", matchingClient.url);
          return matchingClient.focus().then((focusedClient) => {
            // Navegar a la URL destino dentro de la misma pestaña
            if (focusedClient && "navigate" in focusedClient) {
              return focusedClient.navigate(fullUrl);
            }
          });
        } else {
          // Si no hay pestaña abierta, abrir una nueva
          console.log("[SW] Abriendo nueva pestaña:", fullUrl);
          return self.clients.openWindow(fullUrl);
        }
      })
      .catch((err) => {
        console.error("[SW] Error al manejar click de notificación:", err);
        // Fallback: intentar abrir la ventana de todas formas
        return self.clients.openWindow(fullUrl);
      })
  );
});

// ─────────────────────────────────────────────
// PUSHSUBSCRIPTIONCHANGE — Suscripción renovada por el navegador
// ─────────────────────────────────────────────
// Algunos navegadores renuevan la suscripción automáticamente.
// En ese caso, necesitamos actualizar el endpoint en nuestra base de datos.
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Suscripción Push renovada automáticamente por el navegador");

  event.waitUntil(
    (async () => {
      try {
        // Suscribirse con la nueva suscripción
        const newSubscription = event.newSubscription ||
          await self.registration.pushManager.subscribe(
            event.oldSubscription?.options || {
              userVisibleOnly: true,
            }
          );

        if (!newSubscription) {
          console.warn("[SW] No se pudo obtener la nueva suscripción");
          return;
        }

        const key = newSubscription.getKey("p256dh");
        const token = newSubscription.getKey("auth");

        if (!key || !token) {
          console.warn("[SW] Suscripción renovada sin claves válidas");
          return;
        }

        // Notificar al backend sobre la nueva suscripción
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: newSubscription.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
            auth: btoa(String.fromCharCode(...new Uint8Array(token))),
            oldEndpoint: event.oldSubscription?.endpoint,
          }),
        });

        if (!response.ok) {
          console.error("[SW] Error al actualizar suscripción renovada:", response.status);
        } else {
          console.log("[SW] Suscripción renovada guardada correctamente");
        }
      } catch (err) {
        console.error("[SW] Error al manejar pushsubscriptionchange:", err);
      }
    })()
  );
});
