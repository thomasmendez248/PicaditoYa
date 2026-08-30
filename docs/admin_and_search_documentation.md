# 📖 Documentación del Sistema: Panel de Administración y Buscador Público

**PicaditoYa** — Plataforma integral de gestión de turnos y reserva online de canchas deportivas.

---

## 1. Módulo de Administración (`/admin`)

### 1.1 Arquitectura y Seguridad
- **Protección Server-Side**: La seguridad del panel de administración está centralizada en el Server Component [`src/app/admin/layout.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/admin/layout.tsx) mediante `auth()`, validando que el usuario posea rol `admin` o `super_admin` y redirigiendo automáticamente a `/auth/login?callbackUrl=/admin` en caso contrario.
- **Contexto Global de Administración**: [`src/components/admin/AdminContext.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/admin/AdminContext.tsx) mantiene el estado compartido del predio activo seleccionado, la lista de predios del administrador, el límite permitido según el plan (`maxPredios`) y funciones de recarga (`refetchPredios`).

---

### 1.2 Gestión Multisede de Complejos Deportivos (Predios)
- **Límite por Plan (`maxPredios`)**: El administrador puede registrar 1 o más predios según su suscripción (`maxPredios` en la tabla `Usuario`). Los administradores con rol `super_admin` no poseen límite.
- **Selector Desplegable**: Ubicado en el header ([`AdminHeader.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/admin/AdminHeader.tsx)) para alternar rápidamente entre complejos.
- **Creación y Edición Completa**: [`PredioModal.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/admin/PredioModal.tsx) permite:
  - Modificar nombre, dirección completa, teléfono y política de cancelación de reservas.
  - **Búsqueda Geográfica**: Botón *"Buscar en Mapa"* que consulta el servicio de mapas (Nominatim/OpenStreetMap) para autocalcular latitud y longitud a partir de la dirección escrita.
  - **Ubicación GPS**: Botón *"Usar mi GPS"* para obtener las coordenadas actuales del dispositivo.
  - **Eliminación**: Opción para dar de baja predios asociados cuando se tiene más de uno.
- **Endpoints de la API**:
  - `GET /api/admin/predios`: Lista los predios del admin y el límite de su plan.
  - `POST /api/admin/predios`: Crea un nuevo complejo validando el límite `maxPredios`.
  - `PUT /api/admin/predios/[id]`: Actualiza los datos y ubicación del predio.
  - `DELETE /api/admin/predios/[id]`: Elimina el complejo y sus canchas/turnos asociados.

---

### 1.3 Dashboard y Métricas en Tiempo Real (`/admin`)
- **Estadísticas de Ocupación e Ingresos**: [`src/app/admin/page.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/admin/page.tsx) y [`src/app/api/admin/stats/route.ts`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/api/admin/stats/route.ts):
  - Total de canchas activas en el complejo.
  - Turnos totales de hoy (desglosados en confirmados y pendientes).
  - Porcentaje de ocupación del día.
  - Ingresos del mes y del día actual en ARS (`$`).
- **Cronograma de Turnos de Hoy**: Listado interactivo de los próximos turnos programados del día con nombre del cliente, horario, cancha y badge de estado.

---

### 1.4 Gestión de Canchas (`/admin/canchas`)
- **Administración Integral**: Alta, baja y modificación de canchas por predio.
- **Configuración por Cancha**:
  - Nombre (ej: *Cancha 1 - Sintético Pro*).
  - Capacidad / Medidas (*Fútbol 5, 7, 11*).
  - Precio por turno en pesos.
  - Horario de apertura y cierre.
  - Días operativos de la semana (Lunes a Domingo).
  - Duración del turno (30, 60, 90, 120 minutos).
- **Endpoints de la API**:
  - `GET /api/admin/canchas?predioId=...`: Trae todas las canchas del predio.
  - `POST /api/admin/canchas`: Crea una cancha asociada al predio.
  - `PUT /api/admin/canchas/[id]`: Modifica los parámetros de la cancha.
  - `DELETE /api/admin/canchas/[id]`: Elimina la cancha.

---

### 1.5 Turnero Visual Interactivo (`/admin/turnos`)
- **Visualización en Bloques de Horarios**: [`src/components/admin/TurneroVisual.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/admin/TurneroVisual.tsx) genera automáticamente la grilla de turnos según el horario de apertura y cierre de la cancha seleccionada.
- **Código de Colores Dinámico**:
  - 🟢 **Verde (Confirmado)**: Turno asegurado y confirmado.
  - 🟠 **Ámbar (Pendiente)**: Turno reservado pendiente de confirmación/pago.
  - ⚪ **Gris Translúcido (Libre)**: Horario disponible para reserva inmediata.
- **Creación de Turnos con Doble Modalidad**:
  - **Cliente Registrado**: Mediante ID de usuario con cuenta en la plataforma.
  - **Cliente Manual / Mostrador ("Cliente Fantasma")**: Permite registrar el turno ingresando simplemente nombre y teléfono de clientes que reservan en el mostrador o por WhatsApp.
  - **Rango Horario Flexible**: Permite definir horas personalizadas de inicio y fin (ej: turnos de 1h30m o eventos especiales).
- **Gestión de Estados y Liberación**:
  - Modal de detalle para cambiar el estado a *Confirmado*, *Pendiente*, *Completado* o *No-Show (Faltó)*.
  - Botón *"Liberar Turno"* para cancelar y liberar el bloque horario.

---

### 1.6 Menú Radial Lateral Izquierdo (Speed-Dial)
- **Componente**: [`src/components/admin/RadialNavMenu.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/admin/RadialNavMenu.tsx)
- **Ubicación**: Flotante en el **medio del lateral izquierdo** de la pantalla (`top: 50%`, `left: 1.5rem`).
- **Despliegue Radial en Abanico**:
  - Al presionar el botón circular de 3 líneas (`☰`), se abre un abanico hacia la derecha con animación de resplandor neón:
    - ↗️ **Dashboard** (`/admin`)
    - ➡️ **Canchas** (`/admin/canchas`)
    - ↘️ **Turnos** (`/admin/turnos`)

---

## 2. Buscador y Visualización Pública (`/`)

### 2.1 Búsqueda Flexible y Carga Automática
- **Carga Inicial**: Al ingresar a la página principal ([`src/app/page.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/page.tsx)), el sistema consulta automáticamente la API [`/api/disponibilidad`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/api/disponibilidad/route.ts) y renderiza todas las canchas activas en el listado y en el mapa.
- **Filtros Combinables**:
  - **Texto Libre**: Búsqueda por nombre de cancha o nombre de complejo deportivo.
  - **Ubicación Geográfica**: Búsqueda por ciudad/barrio o detección automática de GPS del usuario.
  - **Radio de Cercanía**: Cálculo de distancia mediante la fórmula de Haversine directa en SQL (slider de 1 a 50 km).
  - **Medida de Cancha**: Filtro por capacidad (*Fútbol 5, 7, 11*).
  - **Fecha y Horario Opcionales**: Permite consultar disponibilidad exacta para un horario o explorar libremente todas las opciones del complejo.

### 2.2 Tarjetas Interactivas y Mapa
- Cada tarjeta muestra nombre, complejo, dirección, badge de tipo de cancha, rango de horarios y precio por turno en ARS.
- Al interactuar con una tarjeta, se resalta y enfoca el marcador del predio en el mapa interactivo ([`MapaDisponibilidad.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/components/map/MapaDisponibilidad.tsx)).

### 2.3 Página Pública del Complejo (`/predio/[id]`)
- Vista detallada del predio ([`src/app/predio/[id]/page.tsx`](file:///c:/Users/julian/Documents/PicaditoYa/PicaditoYa/src/app/predio/%5Bid%5D/page.tsx)) con:
  - Información general de la sede, dirección y teléfono.
  - Grilla de todas las canchas que ofrece el complejo.
  - Botón directo de reserva y consulta por **WhatsApp**.
  - Políticas de cancelación de reservas.

---

## 3. Estructura de Datos en Prisma (`schema.prisma`)

```prisma
model Usuario {
  id         String   @id @default(cuid())
  email      String   @unique
  nombre     String
  password   String
  rol        String   @default("cliente") // cliente | admin | super_admin
  maxPredios Int      @default(1)          // Control de sedes según plan
  predios    Predio[]
  turnos     Turno[]
}

model Predio {
  id                       String   @id @default(cuid())
  nombre                   String
  direccion                String
  telefono                 String?
  latitud                  Float
  longitud                 Float
  estado                   String   @default("activo")
  politicaCancelacionHoras Int      @default(24)
  adminId                  String
  admin                    Usuario  @relation(fields: [adminId], references: [id])
  canchas                  Cancha[]
}

model Cancha {
  id                      String   @id @default(cuid())
  nombre                  String
  capacidad               Int      @default(10)
  precioTurno             Float
  duracionTurnoMinutos    Int      @default(60)
  horarioApertura         String   @default("09:00")
  horarioCierre           String   @default("23:00")
  diasOperativos          Int[]    @default([0, 1, 2, 3, 4, 5, 6])
  politicaCancelacionHoras Int?
  predioId                String
  predio                  Predio   @relation(fields: [predioId], references: [id], onDelete: Cascade)
  turnos                  Turno[]
}

model Turno {
  id                     String   @id @default(cuid())
  fecha                  DateTime @db.Date
  horaInicio             String
  horaFin                String
  estado                 String   @default("confirmado") // pendiente | confirmado | completado | cancelado | no_show
  precioAlMomentoReserva Float
  canchaId               String
  cancha                 Cancha   @relation(fields: [canchaId], references: [id], onDelete: Cascade)
  clienteId              String?
  cliente                Usuario? @relation(fields: [clienteId], references: [id])
  nombreClienteManual    String?  // Cliente mostrador / WhatsApp
  telefonoClienteManual  String?
}
```

---

## 4. Credenciales de Prueba para Desarrollo

- **Email**: `admin@test.com`
- **Contraseña**: `123456`
- **Rol**: `admin`
- **Capacidad de Predios**: `2`
