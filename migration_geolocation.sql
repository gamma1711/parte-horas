-- ==========================================
-- MIGRACIÓN: Agregar columnas de geolocalización a time_entries
-- Ejecutar sobre la base de datos existente
-- ==========================================

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lng DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lng DOUBLE PRECISION;
