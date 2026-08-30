# PicaditoYa 🏟️

SaaS de reservas de turnos deportivos para Argentina.

## Stack

| Tecnología | Uso |
|---|---|
| **Next.js 14+** (App Router) | Frontend + Backend |
| **TypeScript** | Tipado estático |
| **TailwindCSS** | Estilos |
| **shadcn/ui** | Componentes UI |
| **Prisma 5** | ORM |
| **PostgreSQL** | Base de datos (Supabase/Neon) |
| **NextAuth.js v5** | Autenticación |
| **Mapbox GL JS** | Mapa de predios |
| **Zod** | Validación |
| **date-fns** | Manejo de fechas |

## Setup inicial

### 1. Clonar y instalar

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completá las siguientes variables en `.env.local`:

- `DATABASE_URL` — URL de conexión a PostgreSQL (Supabase o Neon)
- `NEXTAUTH_SECRET` — Generalo con `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` en desarrollo
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Token de [mapbox.com](https://account.mapbox.com/access-tokens/) (empieza con `pk.`)

### 3. Base de datos

Con la `DATABASE_URL` configurada:

```bash
# Primera migración (crea las tablas)
npm run db:migrate

# O si solo querés pushear sin historial de migraciones:
npm run db:push
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                  # Home con mapa + filtros de disponibilidad
│   ├── auth/                     # Login + registro
│   ├── super-admin/              # Panel super admin (predios, admins, abonos)
│   ├── admin/                    # Panel admin del predio (canchas, turnos, config)
│   ├── empleado/                 # Turnero con marcado de asistencia
│   ├── cliente/                  # Mis turnos + perfil
│   ├── predio/[id]/              # Página pública del predio
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── disponibilidad/       # Búsqueda de canchas disponibles
│       └── turnos/               # Crear y gestionar turnos
├── components/
│   └── map/MapaDisponibilidad    # Mapa Mapbox
├── lib/
│   ├── auth.ts                   # Config NextAuth
│   ├── prisma.ts                 # Singleton Prisma Client
│   ├── disponibilidad.ts         # Lógica compartida de disponibilidad
│   └── validations/              # Schemas Zod
└── types/
    └── next-auth.d.ts            # Extensión de tipos
```

## Roles del sistema

| Rol | Descripción |
|---|---|
| `super_admin` | Crea admins, gestiona predios y cobra abonos |
| `admin` | Gestiona su predio: canchas, turnos y empleados |
| `empleado` | Ve el turnero de su predio y marca asistencia |
| `cliente` | Reserva turnos, puede cancelarlos |

## Scripts útiles

```bash
npm run dev          # Dev server
npm run build        # Build de producción
npm run db:migrate   # Crear migración nueva
npm run db:push      # Push schema sin migración
npm run db:studio    # Abrir Prisma Studio
```

## Reglas de negocio clave

- **No-show**: cancelación fuera de término impacta el puntaje igual que una inasistencia
- **Puntaje de asistencia**: `turnosAsistidos / (turnosAsistidos + noShows) * 100`
- **Política de cancelación**: definida a nivel predio, con override opcional por cancha
- **Marcado de asistencia**: manual por empleado desde el turnero
- **Predios inactivos**: no aparecen en el mapa ni aceptan reservas
- **Empleado**: solo ve su propio predio (filtro automático por `predioId`)
