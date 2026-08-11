UPDATE "usuarios" SET "telefono" = '' WHERE "telefono" IS NULL;
ALTER TABLE "usuarios" ALTER COLUMN "telefono" SET NOT NULL;