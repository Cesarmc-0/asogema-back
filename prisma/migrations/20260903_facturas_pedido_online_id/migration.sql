-- Separa el origen de la factura: los pedidos de comanda (pedidos_online) ya
-- no comparten el campo reserva_id con las reservas de mesa/hotel/evento.
-- Esto elimina el cruce producido por IDs coincidentes entre tablas distintas.
ALTER TABLE "facturas"
  ADD COLUMN IF NOT EXISTS "pedido_online_id" BIGINT;

-- Migración de datos: las facturas RESTAURANTE cuyo reserva_id apuntaba a un
-- pedido online real se mueven a pedido_online_id, dejando reserva_id NULL.
-- Las que no tengan pedido de comanda asociado conservan reserva_id intacto
-- (el código ahora lee pedido_online_id para restaurante, sin tocar reserva_id).
UPDATE "facturas" f
SET "pedido_online_id" = f."reserva_id",
    "reserva_id" = NULL
WHERE f."tipo_reserva" = 'RESTAURANTE'
  AND f."reserva_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "pedidos_online" p WHERE p."id" = f."reserva_id"
  );

-- Índice para búsquedas por pedido online en facturas
CREATE INDEX IF NOT EXISTS "idx_facturas_pedido_online_id"
  ON "facturas"("pedido_online_id");
