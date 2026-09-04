-- Consolida el soft-delete de productos en un único flag: `activo`.
-- productos_menu tenía dos flags redundantes (estado + activo) que podían
-- desincronizarse. `activo` es el soft-delete real (admin lo usa para
-- ocultar/reactivar; nunca borra). Se elimina `estado` y se convierte
-- `activo` de booleano a string tipo ENUM: 'activo' / 'inactivo', default 'activo'.

-- 1) Elimina el flag redundante `estado` si aún existiera.
ALTER TABLE "productos_menu" DROP COLUMN IF EXISTS "estado";

-- 2) Convierte `activo` de boolean a varchar(10) con default 'activo' (idempotente).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'productos_menu' AND column_name = 'activo'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE "productos_menu"
      ALTER COLUMN "activo" TYPE varchar(10)
      USING (CASE WHEN activo THEN 'activo' ELSE 'inactivo' END);
  END IF;
END $$;

ALTER TABLE "productos_menu" ALTER COLUMN "activo" SET DEFAULT 'activo';
