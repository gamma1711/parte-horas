-- Script de inicialización de Base de Datos para la App Parte de Horas
-- Compatible con PostgreSQL (Ejecutable directamente en Supabase)

-- 1. Eliminación de tablas previas si se desea reiniciar el entorno (Opcional)
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- Tabla de Usuarios (Perfiles de Empleados)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Si vas a usar Supabase Auth, podrías vincular el ID así:
    -- id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('worker', 'manager', 'hr')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Registros de Jornada (Partes de Horas)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    
    ot_image_url VARCHAR(1024),
    analitica VARCHAR(100),
    dieta INTEGER DEFAULT 0,
    is_festivo BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Restricción básica: la salida no puede ser antes que la entrada
    CONSTRAINT valid_clock_period CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

-- ==========================================
-- 3. TRIGGERS Y AUTOMATIZACIONES
-- ==========================================

-- Trigger para automatizar el 'updated_at' cada vez que el registro cambie o se apruebe/rechace
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entries
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- 4. ÍNDICES DE RENDIMIENTO
-- ==========================================

-- Mejorará la velocidad drásticamente en los dashboards del Encargado y RRHH
CREATE INDEX idx_time_entries_worker_id ON time_entries(worker_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_status ON time_entries(status);

-- ==========================================
-- 5. DATOS DE PRUEBA (MOCKS) Opcionales
-- ==========================================

INSERT INTO users (id, name, role) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Juan Pérez (Trabajador)', 'worker'),
    ('22222222-2222-2222-2222-222222222222', 'Ana Gómez (Encargada)', 'manager'),
    ('33333333-3333-3333-3333-333333333333', 'Carlos López (RRHH)', 'hr'),
    ('44444444-4444-4444-4444-444444444444', 'María García (Trabajador)', 'worker'),
    ('55555555-5555-5555-5555-555555555555', 'Luis Hernández (Trabajador)', 'worker');
