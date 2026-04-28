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
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    rfc VARCHAR(50) UNIQUE,
    role VARCHAR(100) NOT NULL, -- e.g., 'manager wing', 'hsqe', 'rrhh', 'worker'
    area VARCHAR(100),     -- E.g., 'wing', 'pv oym'
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
    tipo_jornada VARCHAR(50) DEFAULT 'Jornada Activa', -- 'Jornada Activa' o 'Jornada Inactiva'
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

INSERT INTO users (id, name, email, rfc, role, area) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Juan Pérez (Trabajador Wing)', 'juan123@revergygroup.com', 'JUAN123', 'worker', 'wing'),
    ('22222222-2222-2222-2222-222222222222', 'Julian Gallegos (Manager Wing)', 'juli456@revergygroup.com', 'JULI456', 'manager wing', 'wing'),
    ('33333333-3333-3333-3333-333333333333', 'Carlos López (RRHH)', 'carl789@revergygroup.com', 'CARL789', 'rrhh', 'rrhh'),
    ('44444444-4444-4444-4444-444444444444', 'Jorge Contreras (Manager PV)', 'jorg101@revergygroup.com', 'JORG101', 'manager pv oym tastiota', 'pv oym tastiota'),
    ('55555555-5555-5555-5555-555555555555', 'Luis Hernández (Trabajador PV)', 'luis202@revergygroup.com', 'LUIS202', 'worker', 'pv oym tastiota'),
    ('66666666-6666-6666-6666-666666666666', 'Sofia (HSQE)', 'sofi303@revergygroup.com', 'SOFI303', 'hsqe', 'hsqe'),
    ('77777777-7777-7777-7777-777777777777', 'Pedro Martínez (Trabajador HSQE)', 'pedr404@revergygroup.com', 'PEDR404', 'worker', 'hsqe'),
    ('88888888-8888-8888-8888-888888888888', 'Ana Belén (Trabajadora Compras)', 'anab505@revergygroup.com', 'ANAB505', 'worker', 'compras');

-- ==========================================
-- 6. REGISTROS DE PRUEBA (DIFERENTES PERIODOS Y ESTADOS)
-- ==========================================

-- Semana 1: (Marzo 23-29, 2026) - Semana pasada profunda - Aprobados
INSERT INTO time_entries (worker_id, date, clock_in, clock_out, status, analitica, dieta, is_festivo) VALUES
('11111111-1111-1111-1111-111111111111', '2026-03-23', '2026-03-23 08:00:00Z', '2026-03-23 18:00:00Z', 'approved', 'PROY-A', 1, false),
('11111111-1111-1111-1111-111111111111', '2026-03-24', '2026-03-24 08:00:00Z', '2026-03-24 18:30:00Z', 'approved', 'PROY-A', 0, false),
('44444444-4444-4444-4444-444444444444', '2026-03-25', '2026-03-25 09:00:00Z', '2026-03-25 17:00:00Z', 'approved', 'PROY-B', 1, false);

-- Semana 2: (Marzo 30 - Abril 05, 2026) - Rechazados y Pendientes
INSERT INTO time_entries (worker_id, date, clock_in, clock_out, status, comments, analitica, dieta, is_festivo) VALUES
('11111111-1111-1111-1111-111111111111', '2026-03-30', '2026-03-30 08:00:00Z', '2026-03-30 16:00:00Z', 'rejected', 'Falta subir comprobantes y evidencias correspondientes a las obras', 'PROY-C', 0, false),
('55555555-5555-5555-5555-555555555555', '2026-03-31', '2026-03-31 08:30:00Z', '2026-03-31 17:30:00Z', 'pending', NULL, 'PROY-A', 0, false),
('44444444-4444-4444-4444-444444444444', '2026-04-05', '2026-04-05 08:00:00Z', '2026-04-05 14:00:00Z', 'approved', NULL, 'PROY-D', 0, false); -- Trabajó en Domingo

-- Semana 3: (Abril 06 - 12, 2026) - Aprobados con horas extras y festivos
INSERT INTO time_entries (worker_id, date, clock_in, clock_out, status, analitica, dieta, is_festivo) VALUES
('11111111-1111-1111-1111-111111111111', '2026-04-06', '2026-04-06 08:00:00Z', '2026-04-06 20:00:00Z', 'approved', 'PROY-A', 2, false),
('55555555-5555-5555-5555-555555555555', '2026-04-07', '2026-04-07 08:00:00Z', '2026-04-07 16:00:00Z', 'approved', 'PROY-C', 0, true),
('44444444-4444-4444-4444-444444444444', '2026-04-10', '2026-04-10 09:00:00Z', '2026-04-10 18:00:00Z', 'approved', 'PROY-B', 1, false);

-- Semana Actual: (Abril 13 - 19, 2026) - Registros actuales mayormente pendientes
INSERT INTO time_entries (worker_id, date, clock_in, clock_out, status, analitica, dieta, is_festivo) VALUES
('11111111-1111-1111-1111-111111111111', '2026-04-13', '2026-04-13 08:00:00Z', '2026-04-13 17:00:00Z', 'pending', 'PROY-A', 0, false),
('55555555-5555-5555-5555-555555555555', '2026-04-13', '2026-04-13 09:00:00Z', '2026-04-13 18:00:00Z', 'pending', 'PROY-C', 1, false),
('44444444-4444-4444-4444-444444444444', '2026-04-14', '2026-04-14 08:30:00Z', '2026-04-14 14:00:00Z', 'pending', 'PROY-C', 0, false),
('77777777-7777-7777-7777-777777777777', '2026-04-14', '2026-04-14 08:00:00Z', '2026-04-14 17:00:00Z', 'pending', 'PROY-HSQE', 0, false),
('88888888-8888-8888-8888-888888888888', '2026-04-14', '2026-04-14 09:00:00Z', '2026-04-14 18:00:00Z', 'pending', 'PROY-COM', 0, false);


ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lng DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lng DOUBLE PRECISION;
