// @ts-nocheck
/**
 * Supabase Edge Function: send-push-notification
 *
 * Envía notificaciones Web Push usando VAPID a múltiples suscripciones.
 *
 * SEGURIDAD:
 * - Solo puede ser invocada con el service_role key de Supabase.
 * - Nunca es llamada directamente desde el cliente/browser.
 * - El backend de Next.js (API Routes) es el único caller autorizado.
 *
 * VARIABLES DE ENTORNO requeridas en Supabase Secrets:
 *   VAPID_PRIVATE_KEY  — Clave privada VAPID (NUNCA exponer al cliente)
 *   VAPID_SUBJECT      — Mailto o URL del servidor (ej: mailto:soporte@picaditoya.com)
 *   VAPID_PUBLIC_KEY   — Clave pública VAPID (también en frontend como NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *
 * PAYLOAD DE ENTRADA esperado:
 * {
 *   "subscriptions": [
 *     { "endpoint": "...", "p256dh": "...", "auth": "..." }
 *   ],
 *   "notification": {
 *     "title": "Título",
 *     "body": "Mensaje",
 *     "url": "/ruta",
 *     "icon": "/icon.png",
 *     "badge": "/badge.png",
 *     "data": { ... }
 *   },
 *   "userId": "UUID" // para logging
 * }
 *
 * RESPONSE:
 * {
 *   "sent": number,
 *   "failed": number,
 *   "invalidEndpoints": string[]
 * }
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
}

interface RequestBody {
  subscriptions: PushSubscriptionInput[];
  notification: NotificationPayload;
  userId?: string;
}

interface SendResult {
  sent: number;
  failed: number;
  invalidEndpoints: string[];
}

// ─────────────────────────────────────────────
// VAPID — Implementación manual para Deno
// (Web Push con VAPID sin dependencias pesadas)
// ─────────────────────────────────────────────

/**
 * Convierte una base64url string a Uint8Array
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convierte Uint8Array a base64url string
 */
function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Genera el JWT de autorización VAPID
 */
async function generateVapidJWT(
  audience: string,
  subject: string,
  publicKeyBase64url: string,
  privateKeyBase64url: string
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Header
  const header = { typ: "JWT", alg: "ES256" };
  const encodedHeader = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );

  // Payload
  const payload = {
    aud: audience,
    exp: nowSeconds + 12 * 3600, // 12 horas de validez
    sub: subject,
  };
  const encodedPayload = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  // Signingit con la clave privada VAPID (ES256 = ECDSA con P-256)
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Extraer x e y de la clave pública para importar la clave privada en formato JWK
  const pubBytes = base64UrlToUint8Array(publicKeyBase64url);
  const xBytes = pubBytes.slice(1, 33);
  const yBytes = pubBytes.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(xBytes),
    y: uint8ArrayToBase64Url(yBytes),
    d: privateKeyBase64url,
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Genera el header Authorization VAPID
 */
async function buildVapidAuthorizationHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<string> {
  const endpointUrl = new URL(endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  const jwt = await generateVapidJWT(
    audience,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  return `vapid t=${jwt},k=${vapidPublicKey}`;
}

// ─────────────────────────────────────────────
// CIFRADO — Encriptación del payload (Web Push Encryption)
// ─────────────────────────────────────────────
// Implementación de RFC 8291 (Message Encryption for Web Push)
// usando la clave p256dh y auth del cliente.

/**
 * Cifra el payload usando el esquema aesgcm de Web Push (RFC 8291)
 */
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encryptedPayload: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Clave pública del cliente (receptor)
  const clientPublicKey = base64UrlToUint8Array(p256dhBase64);
  // Auth secret del cliente
  const authSecret = base64UrlToUint8Array(authBase64);

  // Generar par de claves ECDH efímeras para el servidor
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Exportar la clave pública del servidor
  const serverPublicKeyRaw = await crypto.subtle.exportKey(
    "raw",
    serverKeyPair.publicKey
  );
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Importar la clave pública del cliente
  const clientPublicCryptoKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derivar los bits compartidos (ECDH)
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicCryptoKey },
    serverKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generar salt aleatorio
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF para derivar la clave de cifrado y el nonce
  const prk = await hkdf(authSecret, sharedSecret, buildAuthContext(clientPublicKey, serverPublicKey), 32);
  const contentEncryptionKey = await hkdf(salt, prk, buildKeyContext(), 16);
  const nonce = await hkdf(salt, prk, buildNonceContext(), 12);

  // Encriptar con AES-128-GCM
  const aesCryptoKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Padding (2 bytes de tamaño de padding + payload)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesCryptoKey,
    paddedPayload
  );

  return {
    encryptedPayload: new Uint8Array(encryptedData),
    serverPublicKey,
    salt,
  };
}

// Helpers de HKDF
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    keyMaterial,
    length * 8
  );

  return new Uint8Array(bits);
}

function buildAuthContext(clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode("P-256ECDH\0");
  const context = new Uint8Array(label.length + 2 + clientPublicKey.length + 2 + serverPublicKey.length);
  let offset = 0;
  context.set(label, offset); offset += label.length;
  context[offset] = (clientPublicKey.length >> 8) & 0xff; offset++;
  context[offset] = clientPublicKey.length & 0xff; offset++;
  context.set(clientPublicKey, offset); offset += clientPublicKey.length;
  context[offset] = (serverPublicKey.length >> 8) & 0xff; offset++;
  context[offset] = serverPublicKey.length & 0xff; offset++;
  context.set(serverPublicKey, offset);
  return context;
}

function buildKeyContext(): Uint8Array {
  return new TextEncoder().encode("Content-Encoding: aesgcm\0");
}

function buildNonceContext(): Uint8Array {
  return new TextEncoder().encode("Content-Encoding: nonce\0");
}

// ─────────────────────────────────────────────
// ENVÍO DE NOTIFICACIÓN
// ─────────────────────────────────────────────

/**
 * Envía una notificación Push a una suscripción específica.
 * Retorna null si fue exitoso, o el código de error HTTP si falló.
 */
async function sendPushToSubscription(
  subscription: PushSubscriptionInput,
  notification: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<number | null> {
  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url || "/",
      icon: notification.icon || "/favicon.ico",
      badge: notification.badge || "/favicon.ico",
      data: notification.data || {},
      tag: notification.tag,
      requireInteraction: notification.requireInteraction || false,
    });

    // Cifrar el payload
    const { encryptedPayload, serverPublicKey, salt } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    // Generar header VAPID
    const authorization = await buildVapidAuthorizationHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject
    );

    // Enviar la notificación al endpoint del navegador
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${uint8ArrayToBase64Url(salt)}`,
        "Crypto-Key": `dh=${uint8ArrayToBase64Url(serverPublicKey)};p256ecdsa=${vapidPublicKey}`,
        "Authorization": authorization,
        "TTL": "2419200", // 28 días (máximo)
        "Urgency": "normal",
      },
      body: encryptedPayload,
    });

    if (response.ok || response.status === 201) {
      return null; // Éxito
    }

    return response.status; // Error HTTP
  } catch (err) {
    console.error("[send-push-notification] Error enviando a:", subscription.endpoint, err);
    return 500;
  }
}

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Verificar VAPID secrets ───
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[send-push-notification] Faltan secrets VAPID");
    return new Response(
      JSON.stringify({ error: "Configuración de VAPID incompleta en el servidor." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // ─── Parsear body ───
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Body inválido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { subscriptions, notification, userId } = body;

  // Validación básica
  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    return new Response(
      JSON.stringify({ error: "Se requiere al menos una suscripción." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!notification?.title || !notification?.body) {
    return new Response(
      JSON.stringify({ error: "La notificación debe tener title y body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ─── Enviar a todas las suscripciones ───
  const result: SendResult = {
    sent: 0,
    failed: 0,
    invalidEndpoints: [],
  };

  console.log(
    `[send-push-notification] Enviando "${notification.title}" a ${subscriptions.length} suscripción(es)`,
    userId ? `para userId: ${userId}` : ""
  );

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const errorCode = await sendPushToSubscription(
        sub,
        notification,
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject
      );

      if (errorCode === null) {
        result.sent++;
        console.log(`[send-push-notification] ✓ Enviado a: ${sub.endpoint.substring(0, 60)}...`);
      } else {
        result.failed++;
        console.error(`[send-push-notification] ✗ Error ${errorCode} en: ${sub.endpoint.substring(0, 60)}...`);

        // Códigos que indican suscripción inválida/expirada (eliminar de la DB)
        if (errorCode === 404 || errorCode === 410) {
          result.invalidEndpoints.push(sub.endpoint);
          console.log(`[send-push-notification] Suscripción marcada como inválida (${errorCode}): ${sub.endpoint.substring(0, 60)}...`);
        }
      }
    })
  );

  console.log(
    `[send-push-notification] Resultado: ${result.sent} enviadas, ${result.failed} fallidas, ${result.invalidEndpoints.length} inválidas`
  );

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
