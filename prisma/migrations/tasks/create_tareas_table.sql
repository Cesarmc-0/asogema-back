CREATE TABLE IF NOT EXISTS tareas (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
  asignado_por BIGINT NOT NULL REFERENCES usuarios(id),
  asignado_a BIGINT NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

-- Crear rol Empleado si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Empleado') THEN
    INSERT INTO roles (nombre, descripcion, estado, created_at, updated_at)
    VALUES ('Empleado', 'Empleado del club con acceso a tareas asignadas', true, NOW(), NOW());
  END IF;
END
$$;
