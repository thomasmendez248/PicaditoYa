-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('super_admin', 'admin', 'empleado', 'cliente');

-- CreateEnum
CREATE TYPE "EstadoPredio" AS ENUM ('activo', 'inactivo', 'pendiente_pago');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('confirmado', 'cancelado_a_tiempo', 'cancelado_tarde', 'completado', 'no_show');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pagado', 'pendiente');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "telefono" TEXT,
    "password_hash" TEXT,
    "image" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'cliente',
    "predio_id" TEXT,
    "puntaje_asistencia" DOUBLE PRECISION,
    "turnos_totales" INTEGER NOT NULL DEFAULT 0,
    "turnos_asistidos" INTEGER NOT NULL DEFAULT 0,
    "turnos_no_show" INTEGER NOT NULL DEFAULT 0,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoPredio" NOT NULL DEFAULT 'pendiente_pago',
    "politica_cancelacion_horas" INTEGER NOT NULL DEFAULT 24,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "admin_id" TEXT NOT NULL,

    CONSTRAINT "predios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canchas" (
    "id" TEXT NOT NULL,
    "predio_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 10,
    "precio_turno" DOUBLE PRECISION NOT NULL,
    "duracion_turno_minutos" INTEGER NOT NULL DEFAULT 60,
    "horario_apertura" TEXT NOT NULL,
    "horario_cierre" TEXT NOT NULL,
    "dias_operativos" INTEGER[],
    "politica_cancelacion_horas" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canchas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "cancha_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'confirmado',
    "precio_al_momento_reserva" DOUBLE PRECISION NOT NULL,
    "cancelado_en" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_abono" (
    "id" TEXT NOT NULL,
    "predio_id" TEXT NOT NULL,
    "mes_correspondiente" DATE NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "fecha_pago" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_abono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_predio_id_fkey" FOREIGN KEY ("predio_id") REFERENCES "predios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predios" ADD CONSTRAINT "predios_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canchas" ADD CONSTRAINT "canchas_predio_id_fkey" FOREIGN KEY ("predio_id") REFERENCES "predios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "canchas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_abono" ADD CONSTRAINT "pagos_abono_predio_id_fkey" FOREIGN KEY ("predio_id") REFERENCES "predios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
