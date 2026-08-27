-- Reporte de cumplimiento del empleado al completar una tarea.
-- reporte: texto obligatorio de lo realizado (validado en backend).
-- reporte_imagen_url: foto opcional de evidencia (S3, prefijo "tareas/").
-- reporte_at: timestamp del reporte. Se sobrescribe si se recompleta.
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS reporte TEXT,
  ADD COLUMN IF NOT EXISTS reporte_imagen_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS reporte_at TIMESTAMP(6);
