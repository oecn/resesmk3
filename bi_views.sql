-- ============================================================
--  bi_views.sql — Vistas de Power BI para Reces MK13
--  PostgreSQL 14+  |  Base de datos: reces
--
--  Vistas incluidas:
--    1. bi_resumen_lotes      — Un lote por fila (reemplaza la anterior)
--    2. bi_distribuciones     — Cada envío a sucursal como fila
--    3. bi_menudencias        — Subproductos unificados por sucursal
--    4. bi_flota_combustible  — Cargas de combustible activas
--    5. bi_flota_gastos       — Gastos de flota
--
--  Modelo de relaciones en Power BI:
--    bi_resumen_lotes.id  →  bi_distribuciones.lote_id  (1:N)
--    bi_flota_combustible.vehiculo_id + bi_flota_gastos.vehiculo_id
--      → se relacionan por vehiculo_id (usar tabla vehiculos como dimensión)
-- ============================================================


-- ============================================================
-- 1. bi_resumen_lotes
--    Mejoras sobre la vista anterior:
--      + cerrado / estado (Abierto / Cerrado)
--      + anho, mes, mes_nombre, semana_iso, anho_semana (Time Intelligence)
--      + cabezas_en_camara, saldo_cabezas
-- ============================================================
DROP VIEW IF EXISTS public.bi_resumen_lotes;
CREATE VIEW public.bi_resumen_lotes AS
SELECT
    -- Identificación
    l.id,
    l.lote,
    TRIM(l.empresa)                                     AS empresa,
    l.fecha,

    -- Dimensiones de tiempo (necesarias para Time Intelligence en Power BI)
    EXTRACT(YEAR  FROM l.fecha)::int                    AS anho,
    EXTRACT(MONTH FROM l.fecha)::int                    AS mes,
    TO_CHAR(l.fecha, 'TMMonth')                         AS mes_nombre,
    EXTRACT(ISODOW FROM l.fecha)::int                   AS dia_semana_num,   -- 1=lun … 7=dom
    TO_CHAR(l.fecha, 'TMDay')                           AS dia_semana_nombre,
    EXTRACT(WEEK FROM l.fecha)::int                     AS semana_iso,
    TO_CHAR(l.fecha, 'IYYY') || '-S' ||
        LPAD(TO_CHAR(l.fecha, 'IW'), 2, '0')            AS anho_semana,      -- ej. '2026-S17'

    -- Estado del lote
    l.cerrado,
    CASE WHEN l.cerrado THEN 'Cerrado' ELSE 'Abierto' END  AS estado,

    -- Compra
    l.cantidad                                          AS cantcompra,
    l.monto,
    COALESCE(l.peso_compra_kg, 0)                       AS kgcompra,

    -- Faena
    COALESCE(f.faenado, 0)                              AS faenado,

    -- Distribución totales
    COALESCE(d.cabs_total, 0)                           AS distribuido,
    COALESCE(d.kg_total,   0)                           AS kg,

    -- Saldos operativos
    GREATEST(COALESCE(f.faenado, 0) - COALESCE(d.cabs_total, 0), 0)  AS cabezas_en_camara,
    COALESCE(f.faenado, 0) - COALESCE(d.cabs_total, 0)               AS saldo_cabezas,

    -- Métricas calculadas
    CASE
        WHEN COALESCE(d.kg_total, 0) > 0
            THEN ROUND(l.monto / d.kg_total, 2)
        ELSE 0
    END                                                 AS costokg,

    CASE
        WHEN COALESCE(f.faenado, 0) > 0
            THEN ROUND(COALESCE(d.cabs_total, 0)::numeric / f.faenado * 100, 2)
        ELSE 0
    END                                                 AS pct_distribuido,

    CASE
        WHEN COALESCE(f.faenado, 0) > 0
            THEN ROUND(100 - COALESCE(d.cabs_total, 0)::numeric / f.faenado * 100, 2)
        ELSE 100
    END                                                 AS pct_restante,

    CASE
        WHEN COALESCE(l.peso_compra_kg, 0) > 0
            THEN ROUND(COALESCE(d.kg_total, 0) / l.peso_compra_kg * 100, 2)
        ELSE 0
    END                                                 AS rend_pct

FROM lotes l
LEFT JOIN (
    SELECT lote_id, SUM(cantidad) AS faenado
    FROM faenas
    GROUP BY lote_id
) f ON f.lote_id = l.id
LEFT JOIN (
    SELECT lote_id,
           SUM(kg)      AS kg_total,
           SUM(cabezas) AS cabs_total
    FROM distribuciones
    GROUP BY lote_id
) d ON d.lote_id = l.id;

COMMENT ON VIEW public.bi_resumen_lotes IS
'Un lote por fila con métricas consolidadas de compra, faena y distribución. Incluye dimensiones de tiempo para Time Intelligence en Power BI.';


-- ============================================================
-- 2. bi_distribuciones
--    Cada registro de envío a sucursal como una fila.
--    Relacionar con bi_resumen_lotes por lote_id.
-- ============================================================
CREATE OR REPLACE VIEW public.bi_distribuciones AS
SELECT
    d.id,
    d.lote_id,
    l.lote,
    TRIM(l.empresa)                                     AS empresa,
    l.fecha                                             AS fecha_compra,
    d.fecha                                             AS fecha_distribucion,

    -- Dimensiones de tiempo
    EXTRACT(YEAR  FROM d.fecha)::int                    AS anho,
    EXTRACT(MONTH FROM d.fecha)::int                    AS mes,
    TO_CHAR(d.fecha, 'TMMonth')                         AS mes_nombre,
    EXTRACT(WEEK FROM d.fecha)::int                     AS semana_iso,
    TO_CHAR(d.fecha, 'IYYY') || '-S' ||
        LPAD(TO_CHAR(d.fecha, 'IW'), 2, '0')            AS anho_semana,

    -- Sucursal destino
    d.local                                             AS sucursal,

    -- Cantidades
    d.kg,
    d.cabezas,
    d.diferencia_kg,

    -- Nota operativa
    COALESCE(d.nota, '')                                AS nota

FROM distribuciones d
JOIN lotes l ON l.id = d.lote_id;

COMMENT ON VIEW public.bi_distribuciones IS
'Cada distribución a sucursal como fila. Relacionar con bi_resumen_lotes por lote_id. Permite análisis por sucursal y fecha de distribución.';


-- ============================================================
-- 3. bi_menudencias
--    Subproductos de las tres sucursales unificados en una vista.
--    Se enriquece con el catálogo de productos para normalizar nombres.
-- ============================================================
DROP VIEW IF EXISTS public.bi_menudencias;
CREATE OR REPLACE VIEW public.bi_menudencias AS
SELECT
    m.id,
    m.sucursal,
    m.fecha,

    -- Dimensiones de tiempo
    EXTRACT(YEAR  FROM m.fecha)::int                    AS anho,
    EXTRACT(MONTH FROM m.fecha)::int                    AS mes,
    TO_CHAR(m.fecha, 'TMMonth')                         AS mes_nombre,
    EXTRACT(ISODOW FROM m.fecha)::int                   AS dia_semana_num,
    TO_CHAR(m.fecha, 'TMDay')                           AS dia_semana_nombre,
    EXTRACT(WEEK FROM m.fecha)::int                     AS semana_iso,
    TO_CHAR(m.fecha, 'IYYY') || '-S' ||
        LPAD(TO_CHAR(m.fecha, 'IW'), 2, '0')            AS anho_semana,

    -- Producto (normalizado a mayúsculas para consistencia)
    UPPER(TRIM(m.producto))                             AS producto,

    -- Cantidades
    m.kg,
    m.unidades,
    CASE
        WHEN m.unidades > 0
            THEN ROUND(m.kg / m.unidades, 3)
        ELSE 0
    END                                                 AS kg_por_unidad

FROM menudencias m
WHERE TRIM(COALESCE(m.producto, '')) <> '';

COMMENT ON VIEW public.bi_menudencias IS
'Subproductos (menudencias) desde tabla unificada por sucursal. Producto normalizado a mayúsculas. Filtrada: excluye registros sin nombre de producto.';


-- ============================================================
-- 4. bi_flota_combustible
--    Cargas de combustible activas (excluye soft-deleted).
--    Incluye info del vehículo y proveedor desnormalizada.
-- ============================================================
CREATE OR REPLACE VIEW public.bi_flota_combustible AS
SELECT
    c.id,

    -- Vehículo
    c.vehiculo_id,
    v.codigo                                            AS vehiculo_codigo,
    v.nombre                                            AS vehiculo_nombre,
    v.chapa,
    v.tipo                                              AS vehiculo_tipo,
    COALESCE(v.sucursal, 'Sin sucursal')                AS sucursal,
    COALESCE(v.chofer,   'Sin asignar')                 AS chofer,

    -- Fecha y dimensiones de tiempo
    c.fecha,
    c.anho,
    c.semana                                            AS semana_iso,
    EXTRACT(MONTH FROM c.fecha)::int                    AS mes,
    TO_CHAR(c.fecha, 'TMMonth')                         AS mes_nombre,
    TO_CHAR(c.fecha, 'IYYY') || '-S' ||
        LPAD(c.semana::text, 2, '0')                    AS anho_semana,

    -- Combustible
    COALESCE(c.tipo_combustible, 'Sin especificar')     AS tipo_combustible,
    c.litros,
    c.importe,
    c.precio_litro,
    c.km_actual,
    COALESCE(c.nro_factura,  '')                        AS nro_factura,
    COALESCE(c.observacion,  '')                        AS observacion,

    -- Proveedor
    COALESCE(p.nombre, 'Sin proveedor')                 AS proveedor_nombre,
    COALESCE(p.tipo,   '')                              AS proveedor_tipo,

    -- Auditoría
    COALESCE(c.cargado_por, '')                         AS cargado_por

FROM cargas_combustible c
JOIN  vehiculos         v ON v.id = c.vehiculo_id
LEFT JOIN proveedores_flota p ON p.id = c.proveedor_id
WHERE c.eliminado_en IS NULL;     -- excluye registros borrados lógicamente

COMMENT ON VIEW public.bi_flota_combustible IS
'Cargas de combustible activas (excluye eliminadas). Incluye datos del vehículo y proveedor. Relacionar con bi_flota_gastos por vehiculo_id para análisis de costo total por vehículo.';


-- ============================================================
-- 5. bi_flota_gastos
--    Gastos de flota (mantenimiento, reparaciones, otros).
--    Proveedor unificado: usa catálogo si existe, campo manual si no.
-- ============================================================
CREATE OR REPLACE VIEW public.bi_flota_gastos AS
SELECT
    g.id,

    -- Vehículo
    g.vehiculo_id,
    v.codigo                                            AS vehiculo_codigo,
    v.nombre                                            AS vehiculo_nombre,
    v.chapa,
    v.tipo                                              AS vehiculo_tipo,
    COALESCE(v.sucursal, 'Sin sucursal')                AS sucursal,
    COALESCE(v.chofer,   'Sin asignar')                 AS chofer,

    -- Fecha y dimensiones de tiempo
    g.fecha,
    g.anho,
    g.semana                                            AS semana_iso,
    EXTRACT(MONTH FROM g.fecha)::int                    AS mes,
    TO_CHAR(g.fecha, 'TMMonth')                         AS mes_nombre,
    TO_CHAR(g.fecha, 'IYYY') || '-S' ||
        LPAD(g.semana::text, 2, '0')                    AS anho_semana,

    -- Tipo de gasto
    tg.nombre                                           AS tipo_gasto,

    -- Importe
    g.importe,
    g.km_actual,

    -- Proveedor: prioriza el del catálogo, cae al campo manual si no hay
    COALESCE(p.nombre,   g.proveedor_nombre, 'Sin proveedor')  AS proveedor_nombre,
    COALESCE(p.ruc,      g.proveedor_ruc,    '')               AS proveedor_ruc,
    COALESCE(p.tipo,     '')                                   AS proveedor_tipo,

    -- Detalle
    COALESCE(g.nro_factura, '')                         AS nro_factura,
    COALESCE(g.detalle,     '')                         AS detalle,

    -- Auditoría
    COALESCE(g.cargado_por, '')                         AS cargado_por

FROM gastos_flota g
JOIN  vehiculos          v  ON v.id  = g.vehiculo_id
JOIN  tipos_gasto_flota  tg ON tg.id = g.tipo_gasto_id
LEFT JOIN proveedores_flota p ON p.id = g.proveedor_id;

COMMENT ON VIEW public.bi_flota_gastos IS
'Gastos de flota con vehículo y tipo de gasto desnormalizados. Proveedor unificado entre catálogo y campo manual. Relacionar con bi_flota_combustible por vehiculo_id.';
