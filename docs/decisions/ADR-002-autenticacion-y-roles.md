# ADR-002: Autenticación y Control de Acceso por Roles

## Status
Accepted

## Date
2026-08-30

## Context
El sistema requiere autenticación de usuarios y distintos niveles de acceso (roles) para gestionar las operaciones de la plataforma. 
Roles definidos:
- `super_admin`: Acceso global a todo el sistema.
- `admin`: Administra un predio específico.
- `empleado`: Gestiona turnos en un predio.
- `cliente`: Reserva turnos.

## Decision
Se decide utilizar **NextAuth.js (Auth.js v5)** con el **Credentials Provider** y **Prisma Adapter**, extendiendo el objeto de sesión JWT con los atributos `rol` y `predioId`. El control de acceso a rutas se realiza mediante el `proxy.ts` (Next.js 16 Middleware).

## Alternatives Considered

### Clerk
- Pros: Muy rápido de configurar, UI lista para usar (Drop-in components).
- Cons: Servicio externo pago. Cobra por usuario activo mensual pasado un cierto límite.
- Rejected: Dado el modelo B2C/B2B donde puede haber muchos clientes finales, Clerk puede volverse un costo significativo. NextAuth.js es open source y gratuito.

### Supabase Auth
- Pros: Integrado con nuestra base de datos.
- Cons: Requiere manejar RLS (Row Level Security) intensivamente en PostgreSQL para que sea seguro, o usar roles personalizados desde el cliente.
- Rejected: NextAuth.js (Auth.js) permite manejar todo en la capa de la aplicación (Next.js server-side) manteniendo el ORM Prisma como fuente de verdad sin enredarnos en configuración RLS avanzada desde el inicio.

## Consequences
- El token JWT contendrá el `rol` del usuario y su `predioId` asociado.
- La protección de páginas se hace de forma global en `proxy.ts` mapeando rutas a roles requeridos.
- Necesitaremos construir la UI de login y registro manualmente, a diferencia de usar Drop-in UIs de terceros.
