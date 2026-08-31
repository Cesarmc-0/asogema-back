-- Galería de imágenes por ítem (habitación, salón o producto).
-- El archivo vive en S3; aquí solo va la referencia (URL).
-- Polimórfica (entidad + entidad_id, sin FK): mismo patrón que facturas.reserva_id/tipo_reserva.
-- La integridad entidad↔ítem se valida en la capa de aplicación.
CREATE TABLE "imagenes" (
    "id" BIGSERIAL NOT NULL,
    "entidad" VARCHAR(20) NOT NULL,
    "entidad_id" BIGINT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_imagenes_entidad" CHECK ("entidad" IN ('habitacion', 'salon', 'producto'))
);

CREATE INDEX "idx_imagenes_entidad" ON "imagenes"("entidad", "entidad_id");

-- Backfill: las imagen_url existentes pasan a ser la foto principal de cada galería
INSERT INTO "imagenes" ("entidad", "entidad_id", "url", "es_principal", "orden")
SELECT 'habitacion', "id", "imagen_url", true, 0 FROM "habitaciones" WHERE "imagen_url" IS NOT NULL AND "imagen_url" <> ''
UNION ALL
SELECT 'salon', "id", "imagen_url", true, 0 FROM "salones" WHERE "imagen_url" IS NOT NULL AND "imagen_url" <> ''
UNION ALL
SELECT 'producto', "id", "imagen_url", true, 0 FROM "productos_menu" WHERE "imagen_url" IS NOT NULL AND "imagen_url" <> '';
