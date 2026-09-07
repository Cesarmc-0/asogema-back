-- Pagos de reservas de hotel: inicial (15%) y saldo al final
CREATE TABLE "pagos_hotel" (
  "id" BIGSERIAL PRIMARY KEY,
  "reserva_id" BIGINT NOT NULL REFERENCES "reservas_hotel"(id) ON DELETE CASCADE,
  "tipo" VARCHAR(10) NOT NULL,
  "monto" DECIMAL(12,2) NOT NULL,
  "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  "metodo_pago" VARCHAR(20),
  "factura_id" BIGINT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_pagos_hotel_reserva" ON "pagos_hotel"("reserva_id");