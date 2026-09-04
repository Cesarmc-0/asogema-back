-- Consolida el soft-delete de productos en un único flag: `activo`.
-- productos_menu tenía dos flags redundantes (estado + activo) que podían
-- desincronizarse. `activo` es el soft-delete real (admin lo usa con
-- activo:false para ocultar y activo:true para reactivar; nunca borra).
-- Se elimina `estado`, quedando `activo` como único control de visibilidad.
ALTER TABLE "productos_menu" DROP COLUMN IF EXISTS "estado";
