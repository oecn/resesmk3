CREATE TABLE IF NOT EXISTS vehiculos (
    id SERIAL PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    chapa TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    anho INTEGER,
    tipo TEXT,
    sucursal TEXT,
    chofer TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT vehiculos_sucursal_check
        CHECK (sucursal IS NULL OR sucursal IN ('aregua', 'luque', 'itaugua'))
);

CREATE TABLE IF NOT EXISTS proveedores_flota (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    ruc TEXT,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT proveedores_flota_tipo_check
        CHECK (tipo IN ('combustible', 'taller', 'otros')),
    CONSTRAINT proveedores_flota_nombre_tipo_key UNIQUE (nombre, tipo)
);

CREATE TABLE IF NOT EXISTS tipos_gasto_flota (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    requiere_km BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cargas_combustible (
    id SERIAL PRIMARY KEY,
    vehiculo_id INTEGER NOT NULL REFERENCES vehiculos(id),
    fecha DATE NOT NULL,
    proveedor_id INTEGER NULL REFERENCES proveedores_flota(id),
    litros NUMERIC(12, 2) NOT NULL CHECK (litros > 0),
    importe NUMERIC(14, 2) NOT NULL CHECK (importe > 0),
    precio_litro NUMERIC(12, 2) NOT NULL CHECK (precio_litro > 0),
    km_actual NUMERIC(12, 2) NULL,
    nro_factura TEXT,
    observacion TEXT,
    semana INTEGER NOT NULL,
    anho INTEGER NOT NULL,
    cargado_por TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMP NULL,
    eliminado_por TEXT NULL,
    motivo_eliminacion TEXT NULL
);

CREATE TABLE IF NOT EXISTS gastos_flota (
    id SERIAL PRIMARY KEY,
    vehiculo_id INTEGER NOT NULL REFERENCES vehiculos(id),
    fecha DATE NOT NULL,
    tipo_gasto_id INTEGER NOT NULL REFERENCES tipos_gasto_flota(id),
    proveedor_id INTEGER NULL REFERENCES proveedores_flota(id),
    importe NUMERIC(14, 2) NOT NULL CHECK (importe > 0),
    km_actual NUMERIC(12, 2) NULL,
    nro_factura TEXT,
    detalle TEXT,
    semana INTEGER NOT NULL,
    anho INTEGER NOT NULL,
    cargado_por TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMP NULL,
    eliminado_por TEXT NULL,
    motivo_eliminacion TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_sucursal ON vehiculos(sucursal);
CREATE INDEX IF NOT EXISTS idx_cargas_combustible_fecha ON cargas_combustible(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_combustible_vehiculo_semana ON cargas_combustible(vehiculo_id, anho, semana);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cargas_combustible_proveedor_factura_activa
    ON cargas_combustible (
        COALESCE(proveedor_id, 0),
        LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g'))
    )
    WHERE nro_factura IS NOT NULL AND BTRIM(nro_factura) <> '' AND eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_flota_fecha ON gastos_flota(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_flota_vehiculo_semana ON gastos_flota(vehiculo_id, anho, semana);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gastos_flota_proveedor_factura_activa
    ON gastos_flota (
        (
            CASE
                WHEN proveedor_id IS NOT NULL THEN 'id:' || proveedor_id::text
                WHEN BTRIM(COALESCE(proveedor_ruc, '')) <> '' THEN 'ruc:' || LOWER(REGEXP_REPLACE(BTRIM(COALESCE(proveedor_ruc, '')), '[[:space:]]+', '', 'g'))
                ELSE 'nombre:' || LOWER(REGEXP_REPLACE(BTRIM(COALESCE(proveedor_nombre, '')), '[[:space:]]+', '', 'g'))
            END
        ),
        LOWER(REGEXP_REPLACE(BTRIM(COALESCE(nro_factura, '')), '[[:space:]]+', '', 'g'))
    )
    WHERE nro_factura IS NOT NULL AND BTRIM(nro_factura) <> '' AND eliminado_en IS NULL;

INSERT INTO tipos_gasto_flota (nombre, requiere_km, activo)
VALUES
    ('combustible', TRUE, TRUE),
    ('mantenimiento', TRUE, TRUE),
    ('reparacion', TRUE, TRUE),
    ('lubricante', TRUE, TRUE),
    ('cubierta', TRUE, TRUE),
    ('peaje', FALSE, TRUE),
    ('viatico', FALSE, TRUE),
    ('otro', FALSE, TRUE)
ON CONFLICT (nombre) DO UPDATE
SET requiere_km = EXCLUDED.requiere_km,
    activo = EXCLUDED.activo;
