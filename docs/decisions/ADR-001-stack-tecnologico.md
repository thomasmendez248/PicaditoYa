# ADR-001: Stack Tecnológico Principal

## Status
Accepted

## Date
2026-08-30

## Context
Necesitamos elegir el stack tecnológico base para PicaditoYa, un SaaS de gestión de turnos para canchas deportivas. Los requisitos clave son:
- Alta velocidad de desarrollo para llegar rápido a producción.
- UI moderna y responsiva.
- Tipado fuerte para evitar errores en producción.
- Base de datos relacional para el manejo de usuarios, predios, canchas, turnos y abonos.
- Integración de mapas para visualizar disponibilidad geográfica de canchas.

## Decision
Elegimos el siguiente stack:
- **Framework:** Next.js 16 (App Router) + TypeScript.
- **Estilos:** TailwindCSS + shadcn/ui.
- **Base de Datos:** PostgreSQL en Supabase.
- **ORM:** Prisma ORM.
- **Mapas:** Mapbox GL JS.

## Alternatives Considered

### React SPA + Node.js Backend separado
- Pros: Separación clara de responsabilidades.
- Cons: Mayor tiempo de configuración y despliegue; requiere mantener dos repositorios o un monorepo complejo.
- Rejected: Next.js nos da frontend y API routes en un solo lugar, acelerando el desarrollo inicial.

### MongoDB (NoSQL)
- Pros: Flexibilidad de esquema.
- Cons: Los datos son inherentemente relacionales (un turno pertenece a una cancha que pertenece a un predio).
- Rejected: Manejar relaciones en NoSQL para este modelo de dominio requeriría mucho código manual.

### Google Maps API
- Pros: Muy conocido y maduro.
- Cons: Precios más altos y requiere tarjeta de crédito para arrancar.
- Rejected: Mapbox ofrece una capa gratuita más generosa y es más fácil de integrar con estilos personalizados.

## Consequences
- El equipo debe familiarizarse con App Router de Next.js (Server Components, Server Actions).
- Todo el código será tipado fuertemente con Prisma y Zod.
- Dependemos de Supabase para la base de datos (Pooler mode en producción).
