-- productos_menu: estado y activo son BOOLEAN (dirección adoptada sobre la old
-- nullable varchar 'activo'/'inactivo'). Esta script sustituye la migración
-- anterior `20260903_productos_softdelete_activo`, que implicaba el sentido
-- opuesto ('activo' string) y quedó obsoleta.
--
-- Idempotente:
--  1) asegura que `estado` existe como boolean
--  2) si `activo` sigue siendo varchar (BD vieja), lo convierte a boolean
--     mapeando 'activo' → true y cualquier otro valor → false

-- 1) agregar `estado` boolean si no existe
ALTER TABLE "productos_menu"
  ADD COLUMN IF NOT EXISTS "estado" BOOLEAN NOT NULL DEFAULT true;

-- 2) si `activo` sigue varchar, migrarlo a boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos_menu' AND column_name = 'activo'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "productos_menu" ALTER COLUMN "activo" DROP DEFAULT;
    ALTER TABLE "productos_menu"
      ALTER COLUMN "activo" TYPE boolean
      USING (CASE WHEN activo = 'activo' THEN true ELSE false END);
    ALTER TABLE "productos_menu" ALTER COLUMN "activo" SET DEFAULT true;
  END IF;
END $$;

ALTER TABLE "productos_menu" ALTER COLUMN "activo" SET DEFAULT true;