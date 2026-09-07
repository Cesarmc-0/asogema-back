-- Reseñas de experiencia por tipo de servicio (hotel / restaurant / events).
-- Creada inicialmente a mano en la BD local (asogema 2026-09-05); esta migración
-- ahora versiona esa creación para aplicar el mismo cambio en Railway/stage.
-- Idempotente: segura de correr dos veces.

CREATE TABLE IF NOT EXISTS "resenas" (
  "id"             BIGSERIAL    PRIMARY KEY,
  "usuario_id"     BIGINT       NOT NULL REFERENCES "usuarios"(id),
  "tipo_servicio"  VARCHAR(20)  NOT NULL CHECK ("tipo_servicio" IN ('hotel', 'restaurant', 'events')),
  "calificacion"   SMALLINT     NOT NULL CHECK ("calificacion" BETWEEN 1 AND 5),
  "texto"          VARCHAR(500) NOT NULL,
  "fecha_creacion" DATE         NOT NULL DEFAULT CURRENT_DATE,
  "activo"         BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "idx_resenas_servicio"
  ON "resenas"("tipo_servicio") WHERE "activo";