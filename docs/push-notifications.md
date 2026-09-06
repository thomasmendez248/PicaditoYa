# Web Push Notifications — PicaditoYa

Sistema de notificaciones Push nativas del navegador, implementado con Web Push API + VAPID + Supabase Edge Functions. No utiliza Firebase, OneSignal ni ningún servicio externo pago.

---

## Arquitectura

```
Browser (usuario)
  │
  ├─► Registro de Service Worker (/public/sw.js)
  │
  ├─► Solicitud de permiso (explícita por el usuario)
  │
  ├─► PushManager.subscribe(vapidPublicKey)
  │     └─► PushSubscription { endpoint, p256dh, auth }
  │
  ├─► POST /api/push/subscribe  ←  valida sesión NextAuth
  │     └─► Prisma → push_subscriptions (DB Supabase)
  │
  └─► Backend de Next.js  →  POST /api/push/send / POST /api/push/test
        └─► Supabase Edge Function: send-push-notification
              ├─► Consulta suscripciones del usuario
              ├─► Web Push Encryption (RFC 8291): ECDH + HKDF + AES-128-GCM
              ├─► VAPID JWT authentication
              ├─► HTTP POST al endpoint del navegador
              └─► Limpia suscripciones inválidas (404/410)

Service Worker (/public/sw.js) — siempre activo aunque la pestaña esté cerrada
  ├─► event: 'push' → showNotification()
  └─► event: 'notificationclick' → focus/open URL
```

---

## Seguridad

| Secreto | Ubicación | ¿Expuesto al cliente? |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env` | ✅ Sí (por diseño) |
| `VAPID_PRIVATE_KEY` | `.env` local + Supabase Secrets | ❌ Nunca |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` (sin `NEXT_PUBLIC_`) | ❌ Nunca |
| `INTERNAL_API_SECRET` | `.env` (sin `NEXT_PUBLIC_`) | ❌ Nunca |

**Flujo de autorización:**
1. El cliente llama solo a `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/test`
2. Esas rutas validan la sesión NextAuth
3. Solo las rutas del servidor llaman a la Edge Function con el `service_role` key
4. La Edge Function nunca es accesible directamente desde el cliente

---

## 1. Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

Salida esperada:
```
Public Key:
BExample_publicKey_base64url_aqui

Private Key:
example_privateKey_base64url_aqui
```

La **clave pública** va en `.env` como `NEXT_PUBLIC_VAPID_PUBLIC_KEY=` y también en los Secrets de Supabase como `VAPID_PUBLIC_KEY`.  
La **clave privada** va en `.env` como `VAPID_PRIVATE_KEY=` y SOLO en los Secrets de Supabase. **Nunca en Git con valor real.**

---

## 2. Variables de entorno locales

Editar `.env`:

```bash
# Supabase
SUPABASE_URL="https://TU-PROJECT-REF.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://TU-PROJECT-REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# VAPID
NEXT_PUBLIC_VAPID_PUBLIC_KEY="tu-vapid-public-key"
VAPID_PRIVATE_KEY="tu-vapid-private-key"
VAPID_SUBJECT="mailto:soporte@picaditoya.com"

# Seguridad interna
INTERNAL_API_SECRET="un-string-aleatorio-largo"
```

> ⚠️ Nunca convertir `VAPID_PRIVATE_KEY` en `NEXT_PUBLIC_VAPID_PRIVATE_KEY`.

---

## 3. Migración de base de datos

La tabla `push_subscriptions` ya fue creada en la migración `20260906_add_push_subscriptions`.

Para aplicarla en un nuevo entorno:

```bash
npx prisma migrate deploy
```

Estructura de la tabla:
```sql
CREATE TABLE push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint   TEXT UNIQUE NOT NULL,   -- Único por dispositivo/navegador
  p256dh     TEXT NOT NULL,          -- Clave pública del cliente
  auth       TEXT NOT NULL,          -- Auth secret del cliente
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Un usuario puede tener múltiples suscripciones** (diferentes dispositivos/navegadores).  
**El endpoint es único** — garantiza que el mismo dispositivo no se guarda dos veces.

---

## 4. Configurar Secrets en Supabase Edge Functions

En el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Edge Functions** → **Secrets**:

| Secret | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | Tu clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Tu clave privada VAPID (**solo aquí, nunca en Git**) |
| `VAPID_SUBJECT` | `mailto:soporte@picaditoya.com` |

O via CLI:
```bash
supabase secrets set VAPID_PUBLIC_KEY="tu-public-key"
supabase secrets set VAPID_PRIVATE_KEY="tu-private-key"
supabase secrets set VAPID_SUBJECT="mailto:soporte@picaditoya.com"
```

---

## 5. Desplegar la Edge Function

```bash
# Desde el directorio raíz del proyecto
supabase functions deploy send-push-notification --no-verify-jwt
```

O desde el Dashboard de Supabase → Edge Functions → Deploy.

**Verificar el despliegue:**
```bash
supabase functions list
```

---

## 6. Cómo enviar notificaciones desde el backend

### Desde una Server Action o API Route de Next.js:

```typescript
import { sendPushNotification } from "@/lib/push-sender"; // helper a crear

await sendPushNotification({
  userId: "cjld2cjxh0000qzrmn831i7rn",  // ID del usuario destinatario
  title: "Reserva confirmada",
  body: "Tu turno para el viernes 20:00 fue confirmado.",
  url: "/cliente/mis-turnos",
  data: {
    type: "reservation",
    id: "turno-123"
  }
});
```

### Via API HTTP (desde cualquier backend):

```bash
curl -X POST https://tu-app.vercel.app/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: TU_INTERNAL_API_SECRET" \
  -d '{
    "userId": "ID_DEL_USUARIO",
    "title": "Reserva confirmada",
    "body": "Tu turno fue confirmado",
    "url": "/cliente/mis-turnos",
    "data": { "type": "reservation", "id": "123" }
  }'
```

---

## 7. Formato del payload de notificación

```json
{
  "title": "Título visible (requerido)",
  "body": "Texto del mensaje (requerido)",
  "url": "/ruta-de-destino",
  "icon": "/icon.png",
  "badge": "/badge.png",
  "tag": "identificador-para-reemplazar-notificaciones-previas",
  "requireInteraction": false,
  "data": {
    "type": "reservation | cancellation | payment | reminder",
    "id": "ID-del-recurso-relacionado"
  }
}
```

### Tipos de notificación sugeridos:

| `type` | Caso de uso |
|---|---|
| `reservation` | Reserva creada/confirmada |
| `cancellation` | Reserva cancelada |
| `payment` | Pago recibido/pendiente |
| `reminder` | Recordatorio de turno próximo |
| `message` | Nuevo mensaje |
| `test` | Notificación de prueba |

---

## 8. Probar notificaciones

### Desde la UI:
1. Ir a `/admin/perfil` o `/cliente/perfil`
2. Activar notificaciones
3. Hacer clic en **"Enviar notificación de prueba"**

### Con la pestaña cerrada:
1. Activar notificaciones
2. Cerrar la pestaña del navegador
3. Llamar a `/api/push/test` con una sesión válida
4. La notificación debe aparecer en el sistema operativo

### Con `curl` (si tenés el endpoint):
```bash
# Primero obtener el cookie de sesión del navegador
curl -X POST http://localhost:3000/api/push/test \
  -H "Cookie: tu-cookie-de-sesion"
```

---

## 9. Limitaciones de navegadores

| Plataforma | Soporte | Notas |
|---|---|---|
| Chrome/Edge (Windows, macOS, Android) | ✅ Completo | Funciona en background |
| Firefox (Windows, macOS, Android) | ✅ Completo | Funciona en background |
| Safari macOS 13+ | ✅ Con permiso | Requiere acción explícita del usuario |
| Safari iOS 16.4+ | ✅ Parcial | Solo con permisos explícitos; algunas limitaciones de background en iOS |
| Safari iOS < 16.4 | ❌ No soportado | — |
| Brave (cualquier OS) | ⚠️ Variable | Depende de la configuración de privacidad |
| Chrome en iOS | ❌ Usa WebKit | Mismas restricciones que Safari iOS |

**Nota iOS:** En iOS, las notificaciones Push desde el navegador tienen restricciones adicionales del sistema operativo. Apple puede cambiar este comportamiento en actualizaciones futuras.

---

## 10. Diagnóstico de problemas

### "Las notificaciones no llegan con la pestaña cerrada"
- Verificar que el Service Worker esté registrado: DevTools → Application → Service Workers
- Verificar que el permiso sea "granted": `Notification.permission`
- Verificar que la suscripción esté en la DB
- Verificar que la Edge Function esté desplegada y los Secrets configurados

### "Error 404/410 al enviar"
- La suscripción expiró o el usuario cambió de navegador
- El sistema elimina automáticamente estas suscripciones

### "VAPID error" en la Edge Function
- Verificar que `VAPID_PRIVATE_KEY` sea la clave correcta (en formato raw base64url)
- Verificar que `VAPID_PUBLIC_KEY` en los Secrets coincida con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en el frontend

### "Error de CORS en la Edge Function"
- La Edge Function no debe ser llamada directamente desde el cliente
- Debe ser invocada solo desde el backend de Next.js

---

## 11. Disparadores Automáticos (Triggers)

El sistema cuenta con 4 disparadores integrados en la lógica de negocio:

| Evento | Destinatario | Título | Disparador |
|---|---|---|---|
| **Aprobación de turno** | Cliente | `¡Turno aprobado! ⚽` | `PUT /api/admin/turnos/[id]` (cambio a `confirmado`) |
| **Recordatorio 30 min antes** | Cliente | `¡Tu partido está por comenzar! ⚽` | `/api/cron/recordatorios` o reactivo en consultas |
| **Solicitud de turno** | Admin | `Nueva solicitud de turno 📋` | `POST /api/turnos` (reserva de turno) |
| **Cancelación de turno** | Admin | `Turno cancelado ❌` | `PATCH /api/turnos/[id]` (cancelación por cliente) |

### Endpoint de Cron / Tareas Programadas
- **URL:** `GET /api/cron/recordatorios`
- **Headers:** `Authorization: Bearer <CRON_SECRET>` o `x-internal-secret: <INTERNAL_API_SECRET>`
- **Acciones:**
  1. Envía recordatorios a partidos que comienzan en ~30 minutos y los marca con `notificacion_30min_enviada = true`.
  2. Cancela turnos pendientes vencidos sin confirmación.

---

## 12. Archivos del sistema

| Archivo | Descripción |
|---|---|
| `public/sw.js` | Service Worker (solo para Push, sin PWA) |
| `src/lib/push-service.ts` | Servicio centralizado backend para envío de Push |
| `src/lib/recordatorios-turnos.ts` | Evaluador y despachador de recordatorios a 30 min |
| `src/lib/hooks/usePushNotifications.ts` | Hook React con toda la lógica de suscripción |
| `src/components/push/PushNotificationsSection.tsx` | Componente UI |
| `src/app/api/push/subscribe/route.ts` | API Route: guardar suscripción |
| `src/app/api/push/unsubscribe/route.ts` | API Route: eliminar suscripción |
| `src/app/api/push/test/route.ts` | API Route: notificación de prueba |
| `src/app/api/push/send/route.ts` | API Route: envío interno manual/super admin |
| `src/app/api/cron/recordatorios/route.ts` | API Route: cron para recordatorios y limpieza |
| `supabase/functions/send-push-notification/index.ts` | Edge Function: envío VAPID |
