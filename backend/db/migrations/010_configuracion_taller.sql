-- ============================================================
-- CONFIGURACION DEL TALLER (identidad / branding)
-- Fila unica (id = 1) con el nombre del taller, sus datos de contacto,
-- sus logos y la bandera de "setup completado" que habilita o bloquea
-- el asistente de bienvenida.
-- Idempotente: se puede volver a aplicar sin efectos secundarios.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion_taller (
    id INT PRIMARY KEY DEFAULT 1,
    nombre_taller VARCHAR(150),
    razon_social VARCHAR(200),
    eslogan VARCHAR(200),
    identidad_rtn VARCHAR(50),
    telefono VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(150),
    direccion TEXT,
    ciudad VARCHAR(100),
    pais VARCHAR(100),
    moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
    locale VARCHAR(20) NOT NULL DEFAULT 'es-419',
    color_primario VARCHAR(20) NOT NULL DEFAULT '#265c7b',
    logo_url TEXT,
    logo_documentos_url TEXT,
    icono_url TEXT,
    setup_completado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_setup TIMESTAMP,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_configuracion_fila_unica CHECK (id = 1)
);

-- La fila unica existe siempre (vacia) para poder leerla sin casos especiales.
INSERT INTO configuracion_taller (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_configuracion_taller_updated_at ON configuracion_taller;
CREATE TRIGGER trg_configuracion_taller_updated_at
BEFORE UPDATE ON configuracion_taller
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();
