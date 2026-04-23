CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL DEFAULT '',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_en TIMESTAMP NOT NULL,
    cerrada_en TIMESTAMP NULL,
    ip TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_abiertas ON sesiones(usuario_id, cerrada_en);

INSERT INTO roles (nombre, descripcion)
VALUES
    ('admin', 'Acceso total al sistema y administracion de usuarios.'),
    ('supervisor', 'Puede revisar y operar modulos de control con permisos amplios.'),
    ('recepcion', 'Puede operar recepcion y carga diaria.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;
