-- Agrega imagen propia por habitación (antes la imagen vivía solo en tipos_habitacion)
ALTER TABLE "habitaciones" ADD COLUMN "imagen_url" VARCHAR(500);
